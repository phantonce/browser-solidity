/* global alert */
var yo = require('yo-yo')
var txExecution = require('./execution/txExecution')
var txFormat = require('./execution/txFormat')
var txHelper = require('./execution/txHelper')
const copy = require('clipboard-copy')

// -------------- styling ----------------------
var csjs = require('csjs-inject')
var styleGuide = require('./style-guide')
var styles = styleGuide()

var css = csjs`
  .runTabView {
    padding: 2%;
    display: flex;
    flex-direction: column;
  }
  .settings extends ${styles.displayBox} {
    margin-bottom: 5%;
  }
  .crow {
    margin-top: .5em;
    display: flex;
  }
  .col1 extends ${styles.titleL} {
    width: 30%;
    float: left;
    align-self: center;
  }
  .col1_1 extends ${styles.titleM} {
    width: 30%;
    min-width: 50px;
    float: left;
    align-self: center;
  }
  .col2 extends ${styles.inputField}{
    width: 70%;
    float: left;
  }
  .select extends ${styles.dropdown} {
    width: 70%;
    float: left;
    text-align: center;
  }
  .copyaddress {
    color: #C6CFF7;
    margin-left: 0.5em;
    margin-top: 0.7em;
    cursor: pointer;
  }
  .copyaddress:hover {
    opacity: .7;
  }
  .selectAddress extends ${styles.dropdown} {
    width: 64%;
    float: left;
    text-align: center;
  }
  .instanceContainer extends ${styles.displayBox}  {
    margin-top: 5%;
  }
  .container extends ${styles.displayBox} {
    margin: 0;
  }
  .contractNames extends ${styles.dropdown} {
    height: 32px;
    font-size: 12px;
    width: 100%;
    font-weight: bold;
    background-color: ${styles.colors.blue};
  }
  .buttons {
    display: flex;
    cursor: pointer;
    justify-content: center;
    flex-direction: column;
    margin: 1%;
    text-align: center;
    font-size: 12px;
  }
  .button {
    display: flex;
    align-items: flex-end;
  }
  .atAddress extends ${styles.button} {
    background-color: ${styles.colors.green};
    margin-top: 10px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .create extends ${styles.button} {
    background-color: ${styles.colors.lightRed};
    margin-top: 10px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .input extends ${styles.inputField} {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    width: 245px;
    font-size: 10px;
    padding-left: 10px;
  }
  .noInstancesText {
    text-align: center;
    color: ${styles.colors.lightGrey};
    font-style: italic;
  }
  .legend extends ${styles.displayBox} {
    margin-top: 5%;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    height: 25px;
    padding: 15px 8px;
  }
  .item {
    margin-right: 1em;
    display: flex;
    align-items: center;
  }
  .transact {
    color: #FFB9B9;
    margin-right: .3em;
  }
  .payable {
    color: #FF8B8B;
    margin-right: .3em;
  }
  .call {
    color: #9DC1F5;
    margin-right: .3em;
  }
`

module.exports = runTab

var instanceContainer = yo`<div class="${css.instanceContainer}"></div>`

function runTab (container, appAPI, appEvents, opts) {
  var el = yo`
  <div class="${css.runTabView}" id="runTabView">
    ${settings(appAPI, appEvents)}
    ${contractDropdown(appAPI, appEvents, instanceContainer)}
    ${instanceContainer}
    ${legend()}
  </div>
  `
  container.appendChild(el)
}

/* ------------------------------------------------
    section CONTRACT DROPDOWN and BUTTONS
------------------------------------------------ */

function contractDropdown (appAPI, appEvents, instanceContainer) {

  var noInstancesText = yo`<div class="${css.noInstancesText}">No Contract Instances.</div>`
  instanceContainer.appendChild(noInstancesText)

  appEvents.compiler.register('compilationFinished', function (success, DATA, source) {
    getContractNames(success, DATA)
  })

  var el = yo`
    <div class="${css.container}">
      <select class="${css.contractNames}"></select>
      <div class="${css.buttons}">
        <div class="${css.button}">
          <div class="${css.atAddress}" onclick=${function () { loadFromAddress(appAPI) }}>At Address</div>
          <input class="${css.input}" placeholder="Enter contract's address - i.e. 0x60606..." title="atAddress" />
        </div>
        <div class="${css.button}">
          <div class="${css.create}" onclick=${function () { createInstance(appAPI) }} >Create</div>
          <input class="${css.input}" placeholder="uint8 _numProposals" title="create" />
        </div>
      </div>
    </div>
  `

  // ADD BUTTONS AT ADDRESS AND CREATE
  function createInstance () {
    var contractNames = document.querySelector(`.${css.contractNames.classNames[0]}`)
    var contracts = appAPI.getContracts()
    var contract = appAPI.getContracts()[contractNames.children[contractNames.selectedIndex].innerText]
    var constructor = txHelper.getConstructorInterface(contracts)
    var args = '' // TODO retrieve input parameter
    txFormat.buildData(contract, contracts, true, constructor, args, appAPI.udapp(), appAPI.executionContext(), (error, data) => {
      if (!error) {
        txExecution.createContract(data, appAPI.udapp(), (error, txResult) => {
          // TODO here should send the result to the dom-console
          //console.log('contract creation', error, txResult)
          var address = appAPI.executionContext().isVM() ? txResult.result.createdAddress : txResult.result.contractAddress
          if (instanceContainer.querySelector(`.${css.noInstancesText}`)) instanceContainer.removeChild(noInstancesText)
          instanceContainer.appendChild(appAPI.udapp().renderInstance(contract, address))
        })
      } else {
        alert(error)
      }
    })
  }
  function loadFromAddress () {
    // var address = // we get that from user (pop-up or...)
    // instanceContainer.appendChild(appAPI.udapp().renderInstance(contract, address))
  }

  // GET NAMES OF ALL THE CONTRACTS
  function getContractNames (success, data) {
    var contractNames = document.querySelector(`.${css.contractNames.classNames[0]}`)
    console.log(contractNames)
    contractNames.innerHTML = ''
    if (success) {
      for (var name in data.contracts) {
        contractNames.appendChild(yo`<option>${name}</option>`)
      }
    } else {
      contractNames.appendChild(yo`<option></option>`)
    }
  }

  return el
}

/* ------------------------------------------------
    section SETTINGS: Environment, Account, Gas, Value
------------------------------------------------ */
function settings (appAPI, appEvents) {
  // COPY ADDRESS
  function copyAddress () {
    copy(document.querySelector('#runTabView #txorigin').value)
  }

  // SETTINGS HTML
  var el = yo`
    <div class="${css.settings}">
      <div class="${css.crow}">
        <div id="selectExEnv" class="${css.col1_1}">
          Environment
        </div>
        <select id="selectExEnvOptions" class="${css.select}">
          <option id="vm-mode"
            title="Execution environment does not connect to any node, everything is local and in memory only."
            value="vm"
            checked name="executionContext">
            JavaScript VM
          </option>
          <option id="injected-mode"
            title="Execution environment has been provided by Mist or similar provider."
            value="injected"
            checked name="executionContext">
            Injected Web3
          </option>
          <option id="web3-mode"
            title="Execution environment connects to node at localhost (or via IPC if available), transactions will be sent to the network and can cause loss of money or worse!
            If this page is served via https and you access your node via http, it might not work. In this case, try cloning the repository and serving it via http."
            value="web3"
            name="executionContext">
            Web3 Provider
          </option>
        </select>
      </div>
      <div class="${css.crow}">
        <div class="${css.col1_1}">Account</div>
        <select name="txorigin" class="${css.selectAddress}" id="txorigin"></select>
        <i title="Copy Address" class="copytxorigin fa fa-clipboard ${css.copyaddress}" onclick=${copyAddress} aria-hidden="true"></i>
      </div>
      <div class="${css.crow}">
        <div class="${css.col1_1}">Gas limit</div>
        <input type="number" class="${css.col2}" id="gasLimit" value="3000000">
      </div>
      <div class="${css.crow} hide">
      <div class="${css.col1_1}">Gas Price</div>
        <input type="number" class="${css.col2}" id="gasPrice" value="0">
      </div>
      <div class="${css.crow}">
      <div class="${css.col1_1}">Value</div>
        <input type="text" class="${css.col2}" id="value" value="0" title="(e.g. .7 ether ...)">
      </div>
    </div>
  `

  // EVENTS
  appEvents.udapp.register('transactionExecuted', (to, data, lookupOnly, txResult) => {
    if (!lookupOnly) el.querySelector('#value').value = '0'
  })

  // DROPDOWN
  var selectExEnv = el.querySelector('#selectExEnvOptions')
  selectExEnv.addEventListener('change', function (event) {
    if (!appAPI.executionContextChange(selectExEnv.options[selectExEnv.selectedIndex].value)) {
      selectExEnv.value = appAPI.executionContextProvider()
    }
  })
  selectExEnv.value = appAPI.executionContextProvider()

  return el
}

/* ------------------------------------------------
              section  LEGEND
------------------------------------------------ */
function legend () {

  var el =
  yo`
    <div class="${css.legend}">
      <div class="${css.item}"><i class="fa fa-circle ${css.transact}" aria-hidden="true"></i>Transact</div/>
      <div class="${css.item}"><i class="fa fa-circle ${css.payable}" aria-hidden="true"></i>Transact(Payable)</div/>
      <div class="${css.item}"><i class="fa fa-circle ${css.call}" aria-hidden="true"></i>Call</div/>
    </div>
  `
  return el
}
