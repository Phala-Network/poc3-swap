import React, { Suspense, useState, useRef} from 'react';
import { GeistProvider, CssBaseline, Button, Description, Card, Link, Page, Row, Col, Text, Input, Spacer, useMediaQuery, useToasts} from '@geist-ui/react'
import * as Icon from '@geist-ui/react-icons'
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from '@polkadot/util';
import { useTranslation } from 'react-i18next';
import Web3 from "web3";
import Web3Modal from "web3modal";
import { network, etherscanBase, loadPhalaTokenContract } from './contracts';
import BN from "bn.js";


import './App.css';

const providerOptions = {};
const web3Modal = new Web3Modal({
  cacheProvider: true, // optional
  providerOptions // required
});

function Loading() {
  return (
      <div className="App">
        <header className="App-header">
          <h1>Loading</h1>
        </header>
      </div>
  );
}


function App() {
  const { t } = useTranslation();
  const isXS = useMediaQuery('xs');
  const width100 = isXS ? {width: '100%'} : {};

  // Web3 connection
  const [provider, setProvider] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [state, setState] = useState('notconnected');
  const connectWeb3 = async() => {
    const provider = await web3Modal.connect();
    if (provider) {
      if (provider.on) {
        provider.on("accountsChanged", (acc) => {
          console.log(acc);
          // setAccounts(acc);
        });
        provider.on("chainChanged", (chainId) => {
          console.log(chainId);
        });
        provider.on("connect", (info) => { // : { chainId: number }
          console.log(info);
        });
        provider.on("disconnect", (error) => {  // : { code: number; message: string }
          console.log(error);
        });
      }
      const web3Instance = new Web3(provider);
      setProvider(provider);
      const acc = await web3Instance.eth.getAccounts();
      setAccounts(acc);
      setState('connected');
      setTabState('sign');
      // TODO: set defult value
      // setBurnAmount(0.1);
      // setToAddress('0x000000000000000000000000000000000000dead');
      setTxHash('');
      setAddress('');
    }
  }

  const disconnectWeb3 = async() => {
    if(provider.close) {
      await provider.close();
    }
    web3Modal.clearCachedProvider();
    setProvider(null);
    setState('notconnected');
    setTabState('sign');
    setAccounts([]);
    // TODO: set defult value
    // setBurnAmount(0.1);
    // setToAddress('0x000000000000000000000000000000000000dead');
    setTxHash('');
    setAddress('');
  }

  // error
  const [toasts, setToast] = useToasts()

  // tab
  const [tabState, setTabState] = useState('sign');
  const tabBurn = () => {
    alert("Send transaction to burn ERC20 PHA tokens and get txHash which can used to claim POC3 testnet PHA tokens, the exchange ratio is 1:1000");
    setBurnAmount(0.1);
    setToAddress('0x000000000000000000000000000000000000dead');
    setTabState('burn');
  }
  const tabSign = () => {
    setTabState('sign');
  }

  // sign message
  const [txHash, setTxHash, ] = useState('');
  const handleTxHash = (e) => {
    setTxHash(e.target.value);
    console.log(e.target.value);
  }
  const [address, setAddress] = useState('');
  const handleAddress = (e) => {
    setAddress(e.target.value);
    console.log(e.target.value);
  }
  const sig = useRef(null)
  const setSignature = async() => {
    let result = '';
    if(address.length === 48 && txHash.length === 66) {
      let tAddress = u8aToHex(decodeAddress(address));
      tAddress = tAddress.substr(2, tAddress.length-2);
      let tTxHash = txHash.substr(2, txHash.length-2);
      let msg = tAddress + tTxHash;
      if (msg.length !== 0) {
        const web3Instance = new Web3(provider);
        const prefix = web3Instance.utils.utf8ToHex("\x19Ethereum Signed Message:\n" + (msg.length/2))
        result = await web3Instance.eth.sign(web3Instance.utils.sha3(prefix + msg), accounts[0]);
      }
    }
    sig && (sig.current.value = result)
  }

  // burn tokens
  const [burnAmount, setBurnAmount, ] = useState(0.1);
  const handleBurnAmount = (e) => {
    setBurnAmount(e.target.value);
    console.log(e.target.value);
  }
  const [toAddress, setToAddress] = useState('0x000000000000000000000000000000000000dead');
  const handleToAddress = (e) => {
    setToAddress(e.target.value);
    console.log(e.target.value);
  }

  const tx = useRef(null);
  const sendTx = async() => {
    let result = '';
    const web3Instance = new Web3(provider);
    const contract = loadPhalaTokenContract(web3Instance);
    try {
      console.log(toAddress);
      let amount = web3Instance.utils.toWei(burnAmount.toString());
      console.log(amount);
      const receipt = await contract.methods.transfer(toAddress, amount)
          .send({from: accounts[0]});
      setTxHash(receipt.transactionHash);
      result = receipt.transactionHash;
    } catch (err) {
      setToast({
        text: "Failed: " + err.message,
        type: "error",
      });
    }
    tx && (tx.current.value = result);
  }

  return (
    <div className="App">
      <Page>
        <Spacer />
        <Page.Header>
          <Text h3 style={{marginTop: '30px'}} color>PHA {t('Burn & Sign App')}</Text>
          <Text small className='links'>
            <Link href='https://phala.network/' color>Home</Link>
            <Link href='https://t.me/phalanetwork' color>Telegram</Link>
          </Text>
        </Page.Header>
        <Page.Content>
          <Col>
            <Row>
            {!provider && <Button icon={<Icon.LogIn/>} auto type="secondary" ghost onClick={connectWeb3}>{t('Connect Wallet')}</Button>}
            {provider && (
                <Row>
                  <Button icon={<Icon.LogOut/>} auto type="secondary" ghost onClick={disconnectWeb3}>{t('Disconnect Wallet')}</Button>
                  <Spacer x={1} />
                  {tabState === 'burn' && <Button icon={<Icon.Repeat/>} auto type="secondary" ghost onClick={tabSign}>{t('Sign Message')}</Button>}
                  {tabState === 'sign' && <Button icon={<Icon.Repeat/>} auto type="secondary" ghost onClick={tabBurn}>{t('Burn Tokens')}</Button>}

                </Row>
            )}
            </Row>

            <Spacer />
            <Input readonly placeholder={t('')} initialValue={accounts[0]} onChange={handleTxHash} width="75%">
              <Description title={t('ETH Account')}/>
            </Input>

            <Spacer />
            {accounts.length > 0 && (
                <Col>
                  {tabState === 'sign' && (
                      <Col>
                        <Text h4 p type="success">{t('Sign Message')}</Text>
                        <Spacer />
                        <Input clearable placeholder={t('ss58 format')} onChange={handleAddress} width="75%">
                          <Description title={t('PHA Address')}/>
                        </Input>
                        <Spacer />
                        <Input clearable placeholder={t('0x prefixed hex')} onChange={handleTxHash} width="75%">
                          <Description title={t('ETH TxHash')}/>
                        </Input>
                        <Spacer />
                        <Button icon={<Icon.Edit3 />} auto type="secondary" ghost onClick={setSignature} style={width100}>{t('Generate Signature')}</Button>
                        <Spacer />
                        <Input readonly placeholder={t('')} onChange={e => console.log(e.target.value)} ref={sig} width="75%">
                          <Description title={t('Signature')}/>
                        </Input>
                      </Col>
                  )}
                  {tabState === 'burn' && (
                      <Col>
                        <Text h4 p type="success">{t('Burn Tokens')}</Text>
                        <Spacer />
                        <Input readonly placeholder={t('')} initialValue={0.1} onChange={handleBurnAmount} width="75%">
                          <Description title={t('Burn Amount')}/>
                        </Input>
                        <Spacer />
                        <Input readonly placeholder={t('')} initialValue={'0x000000000000000000000000000000000000dead'} onChange={handleToAddress} width="75%">
                          <Description title={t('Burn ToAddress')}/>
                        </Input>
                        <Spacer />
                        <Button icon={<Icon.FileText />} auto type="secondary" ghost onClick={sendTx} style={width100}>{t('Send Transaction')}</Button>
                        <Spacer />
                        <Input readonly placeholder={t('')} onChange={e => console.log(e.target.value)} ref={tx} width="75%">
                          <Description title={t('ETH TxHash')}/>
                        </Input>
                      </Col>
                  )}
                </Col>
            )}
          </Col>
        </Page.Content>
      </Page>
    </div>
  );
}

const myTheme = {
  // "type": "dark",
  "palette": {
    "accents_1": "#111",
    "accents_2": "#333",
    "accents_3": "#444",
    "accents_4": "#666",
    "accents_5": "#888",
    "accents_6": "#999",
    "accents_7": "#eaeaea",
    "accents_8": "#fafafa",
    "background": "#000",
    "foreground": "#fff",
    "selection": "#D1FF52",
    "secondary": "#888",
    "success": "#D1FF52",
    "successLight": "#D1FF52",
    "successDark": "#D1FF52",
    "code": "#79ffe1",
    "border": "#333",
    "link": "#D1FF52",
  },
  "expressiveness": {
    "dropdownBoxShadow": "0 0 0 1px #333",
    "shadowSmall": "0 0 0 1px #333",
    "shadowMedium": "0 0 0 1px #333",
    "shadowLarge": "0 0 0 1px #333",
    "portalOpacity": 0.75,
  }
};

function DecorateApp () {
  return (
      <GeistProvider theme={myTheme}>
        <CssBaseline />
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </GeistProvider>
  );
}

export default DecorateApp;
