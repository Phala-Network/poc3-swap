import React, { useEffect, Suspense, useState, useMemo} from 'react';
import { GeistProvider, CssBaseline, Button, Card, Description, Link, Page, Radio, Row, Text, useMediaQuery, Input, Spacer} from '@geist-ui/react'
import * as Icon from '@geist-ui/react-icons'
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from '@polkadot/util';
import { useTranslation } from 'react-i18next';
import Web3 from "web3";
import Web3Modal from "web3modal";

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


  const [provider, setProvider] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [state, setState] = useState('notconnected');
  const [txHash, setTxHash, ] = useState('0x');
  const handleTxHash = (e) => {
    setTxHash(e.target.value);
    console.log(e.target.value);
  }
  const [address, setAddress] = useState('');
  const handleAddress = (e) => {
    setAddress(e.target.value);
    console.log(e.target.value);
  }
  const sig = React.useRef(null)

  const setSignature = async() => {
    let result = '';
    if(address.length === 48 && txHash.length === 66) {
      let tAddress = u8aToHex(decodeAddress(address));
      tAddress = tAddress.substr(2, tAddress.length-2);
      const tTxHash =  txHash.substr(2, txHash.length-2);
      let msg = tAddress + tTxHash;
      if (msg.length !== 0) {
        const web3Instance = new Web3(provider);
        const prefix = web3Instance.utils.utf8ToHex("\x19Ethereum Signed Message:\n" + (msg.length/2))
        result = await web3Instance.eth.sign(web3Instance.utils.sha3(prefix + msg), accounts[0]);
      }
    }
    sig && (sig.current.value = result)
  }

  async function connectWeb3() {
    setState('notconnected');
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
      setState('loading');
      setTxHash('0x');
      setAddress('');
    }
  }

  async function disconnectWeb3() {
    if(provider.close) {
      await provider.close();
    }
    web3Modal.clearCachedProvider();
    setProvider(null);
    // setWeb3(null);
    setAccounts([]);
  }

  return (
    <div className="App">
      <Page>
        <Spacer />
        <Page.Header>
          <Text h3 style={{marginTop: '40px'}} color>PHA {t('Sign Message')}</Text>
          <Text small className='links'>
            <Link href='https://phala.network/' color>Home</Link>
            <Link href='https://t.me/phalanetwork' color>Telegram</Link>
          </Text>
        </Page.Header>
        <Page.Content>
          <Row style={{marginBottom: '25px'}}>
            {!provider && <Button icon={<Icon.LogIn />} auto type="secondary" onClick={connectWeb3} style={width100}>{t('Connect Wallet')}</Button>}
            {provider && <Button icon={<Icon.LogOut/>} auto type="secondary" onClick={disconnectWeb3} style={width100}>{t('Disconnect Wallet')}</Button>}
          </Row>
          {accounts.length >= 1 && (
              <>
                <Spacer />
                <Input readOnly initialValue={accounts[0]} width="70%">
                  <Description title={t('ETH Account')}/>
                </Input>
                <Spacer />
                <Input clearable initialValue="0x" onChange={handleTxHash} width="70%">
                  <Description title={t('ETH TxHash')}/>
                </Input>
                <Spacer />
                <Input clearable initialValue="" onChange={handleAddress} width="70%">
                  <Description title={t('PHA Address')}/>
                </Input>
                <Spacer />
                <Button icon={<Icon.FileText />} auto type="secondary" onClick={setSignature} style={width100}>{t('Sign Message')}</Button>
                <Spacer />
                <Input readOnly  width="70%" onChange={e => console.log(e.target.value)} ref={sig} />
              </>
          )}
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
    "link": "#D1FF52"
  },
  "expressiveness": {
    "dropdownBoxShadow": "0 0 0 1px #333",
    "shadowSmall": "0 0 0 1px #333",
    "shadowMedium": "0 0 0 1px #333",
    "shadowLarge": "0 0 0 1px #333",
    "portalOpacity": 0.75
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
