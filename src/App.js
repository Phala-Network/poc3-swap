import React, { Suspense, useState, useRef} from 'react';
import { GeistProvider, CssBaseline, Button, Description, Card, Link, Page, Row, Col, Text, Input, Spacer, useMediaQuery, useToasts} from '@geist-ui/react'
import * as Icon from '@geist-ui/react-icons'
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from '@polkadot/util';
import { useTranslation } from 'react-i18next';
import Web3 from "web3";
import Web3Modal from "web3modal";
import { loadPhalaTokenContract } from './contracts';

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
    try {
      setCallMetaMask(true);
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
        setCallMetaMask(false);
        // TODO: set defult value
        // setBurnAmount(0.1);
        // setToAddress('0x000000000000000000000000000000000000dead');
        setTxHash('');
        setAddress('');
        setCallMetaMask(false);
      }
    } catch (err) {
      setCallMetaMask(false);
      setToast({
        text: "Failed: " + err.message,
        type: "error",
      });
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
    setCallMetaMask(false);
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
  const [callMetaMask, setCallMetaMask] = useState(false);

  const tabBurn = () => {
    setBurnAmount(burnAmount);
    setToAddress(toAddress);
    setTabState('burn');
  }
  const tabSign = () => {
    setTxHash(txHash);
    setAddress(address);
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
        try {
          setCallMetaMask(true);
          result = await web3Instance.eth.sign(web3Instance.utils.sha3(prefix + msg), accounts[0]);
          setToast({
            text: "Success",
            type: "success",
          });
          setCallMetaMask(false);
        } catch (err) {
          setCallMetaMask(false);
          setToast({
            text: "Failed: " + err.message,
            type: "error",
          });
        }
      }
    }
    else {
      setToast({
        text: "Failed: invalid address or txHash format",
        type: "error",
      });
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
    alert("Send transaction to burn ERC20 PHA tokens and get txHash which can used to claim POC3 testnet PHA tokens, the exchange ratio is 1:1000");
    let result = '';
    const web3Instance = new Web3(provider);
    const contract = loadPhalaTokenContract(web3Instance);
    let amount = web3Instance.utils.toWei(burnAmount.toString());
    try {
      setCallMetaMask(true);
      const receipt = await contract.methods.transfer(toAddress, amount)
          .send({from: accounts[0]});
      setTxHash(receipt.transactionHash);
      setToast({
        text: "Success",
        type: "success",
      });
      result = receipt.transactionHash;
      setCallMetaMask(false);
    } catch (err) {
      setCallMetaMask(false);
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
          <Text h3 style={{marginTop: '20px'}} color>PHA {t('Burn & Sign App')}</Text>
          <Text small className='links'>
            <Link href='https://phala.network/' color>Home</Link>
            <Link href='https://t.me/phalanetwork' color>Telegram</Link>
          </Text>
        </Page.Header>
        <Page.Content>
          <Col>
            <Row>
            {!provider && <Button icon={<Icon.LogIn/>} auto shadow ghost  type="secondary" onClick={connectWeb3} disabled={callMetaMask}>{t('Connect Wallet')}</Button>}
            {provider && <Button icon={<Icon.LogOut/>} auto shadow ghost  type="secondary" onClick={disconnectWeb3} disabled={callMetaMask}>{t('Disconnect Wallet')}</Button>}
            </Row>

            <Spacer />
            <Input readonly placeholder={t('')} initialValue={accounts[0]} onChange={handleTxHash} width="80%">
              <Description title={t('ETH Account')}/>
            </Input>

            <Spacer />
            {accounts.length > 0 && (
                <Col>
                  {tabState === 'sign' && (
                      <Col>
                        <Row>
                          <Button icon={<Icon.Circle/>} auto ghost style={{ color:"#888" }} onClick={tabBurn} disabled={callMetaMask}>{t('Burn Tokens')}</Button>
                          <Button icon={<Icon.Disc/>} auto shadow type="secondary" onClick={tabSign} disabled={callMetaMask}>{t('Sign Message')}</Button>
                        </Row>
                        <Spacer />
                        <Input clearable placeholder={t('ss58 format')} initialValue={address} onChange={handleAddress} width="80%">
                          <Description title={t('PHA Address')}/>
                        </Input>
                        <Spacer />
                        <Input clearable placeholder={t('0x prefixed hex')} initialValue={txHash} onChange={handleTxHash} width="80%">
                          <Description title={t('ETH TxHash')}/>
                        </Input>
                        <Spacer />
                        <Button icon={<Icon.Edit3 />} auto shadow ghost  type="secondary"  onClick={setSignature} style={width100} disabled={callMetaMask}>{t('Generate Signature') }</Button>
                        <Spacer />
                        <Input readonly placeholder={t('')} onChange={e => console.log(e.target.value)} ref={sig} width="80%">
                          <Description title={t('Signature')}/>
                        </Input>
                      </Col>
                  )}
                  {tabState === 'burn' && (
                      <Col>
                        <Row>
                          <Button icon={<Icon.Disc/>} auto shadow type="secondary" onClick={tabBurn} disabled={callMetaMask}>{t('Burn Tokens')}</Button>
                          <Button icon={<Icon.Circle/>} auto ghost style={{ color:"#888" }} onClick={tabSign} disabled={callMetaMask}>{t('Sign Message')}</Button>
                        </Row>
                        <Spacer />
                        <Input readonly placeholder={t('')} initialValue={0.1} onChange={handleBurnAmount} width="80%">
                          <Description title={t('Burn Amount')}/>
                        </Input>
                        {/*<Spacer />*/}
                        {/*<Input readonly placeholder={t('')} initialValue={'0x000000000000000000000000000000000000dead'} onChange={handleToAddress} width="80%">*/}
                        {/*  <Description title={t('Burn ToAddress')}/>*/}
                        {/*</Input>*/}
                        <Spacer />
                        <Button icon={<Icon.FileText />} auto shadow ghost type="secondary" onClick={sendTx} style={width100} disabled={callMetaMask}>{t('Send Transaction')}</Button>
                        <Spacer />
                        <Input readonly placeholder={t('')} onChange={e => console.log(e.target.value)} ref={tx} width="80%">
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
    "success": "#708634",
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
    "portalOpacity": 0.80,
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
