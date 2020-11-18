import React, { Suspense, useState, useRef} from 'react';
import { GeistProvider, CssBaseline, Button, Spacer, Divider, Note, Loading, Spinner,Link, Page, Row, Col, Text, Input, useMediaQuery, useToasts} from '@geist-ui/react'
import * as Icon from '@geist-ui/react-icons'
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from '@polkadot/util';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { useTranslation } from 'react-i18next';
import Web3 from "web3";
import Web3Modal from "web3modal";
import Raven from 'raven-js'

import {
  ethNetwork,
  etherscanBase,
  phalaBase,
  wsEndPoint,
  loadPhalaTokenContract
} from './config';

import {
  burnWarning,
  burnAmountNote,
  burnTxLinkPrefix,
  burnTxLinkSuffix,
  claimTxLinkPrefix,
  claimTxLinkSuffix,
  walletErrorPrefix,
  walletErrorSuffix,
} from './msg';

import './App.css';

Raven.config('https://6259686285ce469f9222c63f918700e7@o478466.ingest.sentry.io/5521029');
const types = require('./typedefs.json');
const providerOptions = {};
const web3Modal = new Web3Modal({
  network: ethNetwork, // optional
  cacheProvider: true, // optional
  providerOptions // required
});
const metamaskLink = "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en";

function App() {
  const { t } = useTranslation();
  const isXS = useMediaQuery('xs');

  // call state
  const [calling, setCalling] = useState(false);
  const [connectCalling, setConnectCalling] = useState(false);
  const [burnCalling, setBurnCalling] = useState(false);
  const [signCalling, setSignCalling] = useState(false);
  const [claimCalling, setClaimCalling] = useState(false);

  // toast
  const [toasts, setToast] = useToasts()


  // Web3 connection
  const [provider, setProvider] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [state, setState] = useState('notconnected');
  const [connectError, setConnectError] = useState('');

  const connectWeb3 = async() => {

    try {
      setCalling(true);
      setConnectCalling(true);
      const provider = await web3Modal.connect();
      if (provider) {
        if (provider.on) {
          provider.on("accountsChanged", (acc) => {
            console.log(acc);
            setAccounts(acc);
          });
          provider.on("chainChanged", (chainId) => {
            console.log(chainId);
          });
          provider.on("connect", (info) => { // : { chainId: number }
            console.log(info);
          });
          provider.on("disconnect", (error) => {  // : { code: number; message: string }
            console.log(error);
            throw new Error("disconnect")
          });
        }
        const web3Instance = new Web3(provider);
        setProvider(provider);
        const acc = await web3Instance.eth.getAccounts();
        setAccounts(acc);
        setState('connected');
        setTabState('burn');
        setBurnCalling(false);
        setSignCalling(false);
        setClaimCalling(false);
        setBurnTxError('');
        setClaimTxError('');
        setToast({
          text: "Success: Connect to your wallet",
          type: "success",
        });
        setConnectError('');
        setCalling(false);
        setConnectCalling(false);
      }
    } catch (err) {
      setCalling(false);
      setConnectCalling(false);
      setConnectError('Error: ' + err.message);
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
    setAccounts([]);
    setTabState('burn');
    setBurnCalling(false);
    setSignCalling(false);
    setClaimCalling(false);
    setBurnTxError('');
    setClaimTxError('');
    setConnectError('');
    setCalling(false);
    setConnectCalling(false);
  }

  // tab state
  const [tabState, setTabState] = useState('burn');
  const tabBurn = () => {
    setBurnAmount(burnAmount);
    setToAddress(toAddress);
    setTabState('burn');
  }
  const tabClaim = () => {
    setTxHash(txHash);
    setAddress(address);
    setTabState('claim');
  }

  // burn tokens
  const [burnAmount, setBurnAmount, ] = useState(0.1);
  const handleBurnAmount = (e) => {
    setBurnAmount(e.target.value);
  }
  const [toAddress, setToAddress] = useState('0x000000000000000000000000000000000000dead');
  const handleToAddress = (e) => {
    setToAddress(e.target.value);
  }
  const [burnTxHash, setBurnTxHash] = useState('');
  const [burnTxLink, setBurnTxLink] = useState('');
  const [burnTxError, setBurnTxError] = useState('');

  const sendTx = async() => {
    alert(burnWarning);
    try {
      setCalling(true);
      setBurnCalling(true);
      const web3Instance = new Web3(provider);
      const contract = loadPhalaTokenContract(web3Instance);
      let amount = web3Instance.utils.toWei(burnAmount.toString());
      const receipt = await contract.methods.transfer(toAddress, amount)
          .send({from: accounts[0]});
      setTxHash(receipt.transactionHash);
      setBurnTxHash(receipt.transactionHash)
      setBurnTxLink(etherscanBase + '/tx/' + receipt.transactionHash);
      setToast({
        text: "Success: Send burn transaction",
        type: "success",
      });
      setBurnTxError('');
      setCalling(false);
      setBurnCalling(false);
    } catch (err) {
      setCalling(false);
      setBurnCalling(false);
      let sentryMsg = "Burn error: " + "Account: " + accounts[0] + ' ' +  err.message;
      Raven.captureException(sentryMsg);
      setBurnTxError('Error: ' + err.message);
      setToast({
        text: "Failed: " + err.message,
        type: "error",
      });
    }
  }


  // claim tokens
  const [txHash, setTxHash, ] = useState('');
  const handleTxHash = (e) => {
    setTxHash(e.target.value);
  }
  const [address, setAddress] = useState('');
  const handleAddress = (e) => {
    setAddress(e.target.value);
  }
  const [signature, setSignature] = useState('');
  const [claimTxLink, setClaimTxLink] = useState('');
  const [claimTxError, setClaimTxError] = useState('');
  const claimTokens = async() => {
    try {
      setCalling(true);
      setSignCalling(true);
      setClaimCalling(true);
      if(address.length !== 48 || txHash.length !== 66) {
        setCalling(false);
        setSignCalling(false);
        setClaimCalling(false);
        setClaimTxError('Error: Invalid address or txHash format');
        let sentryMsg = "Claim error: " + "Account: " + accounts[0] + "Address: " + address + "TxId: " + txHash + " "
            +  "Error: Invalid address or txHash format";
        Raven.captureException(sentryMsg);
        setToast({
          text: "Failed: Invalid address or txHash format",
          type: "error",
        });
      } else {
        let tAddress = u8aToHex(decodeAddress(address));
        tAddress = tAddress.substr(2, tAddress.length-2);
        let tTxHash = txHash.substr(2, txHash.length-2);
        let msg = tAddress + tTxHash;
        const web3Instance = new Web3(provider);
        let sig = await web3Instance.eth.personal.sign('0x' + msg, accounts[0], '');
        setSignature(sig);
        setSignCalling(false);
        const wsProvider = new WsProvider(wsEndPoint);
        const api = await ApiPromise.create({provider: wsProvider, types});
        await cryptoWaitReady();
        const txInfo = await api.query.phaClaim.burnedTransactions(txHash);
        const isClaimed = await api.query.phaClaim.claimState(txHash);
        if(txInfo[0].toString() === '0x0000000000000000000000000000000000000000') {
          setCalling(false);
          setSignCalling(false);
          setClaimCalling(false);
          let sentryMsg = "Claim error: " + "Account: " + accounts[0] + " Address: " + address + " TxId: " + txHash
              +  " Error: This txHash is in crawling, please wait 2 minutes and retry";
          Raven.captureException(sentryMsg);
          setClaimTxError('Error: This txHash is in crawling, please wait 2 minutes and retry');
          setToast({
            text: "Failed: This txHash is in crawling, please wait 2 minutes and retry",
            type: "error",
          });
        } else if (isClaimed.toString() === 'true'){
          setCalling(false);
          setSignCalling(false);
          setClaimCalling(false);
          setClaimTxError('Error: This txHash has been claimed');
          setToast({
            text: "Failed: This txHash has been claimed",
            type: "error",
          });
        } else {
          const claimTx = api.tx.phaClaim.claimErc20Token(address, txHash, sig);
          await new Promise(async (resolve, _reject) => {
            await claimTx.send(({events = [], status}) => {
              if (status.isInBlock) {
                let error;
                for (const e of events) {
                  const {event: {data, method, section}} = e;
                  if (section === 'system' && method === 'ExtrinsicFailed') {
                    error = data[0];
                  }
                }
                if (error) {
                  throw new Error(`Extrinsic failed : ${error}`);
                }
                resolve({
                  hash: status.asInBlock,
                  events: events,
                });
                setClaimTxLink(phalaBase + '/#/explorer/query/' + status.asInBlock.toHex().toString());
                setToast({
                  text: "Success: Claim poc3 tokens",
                  type: "success",
                });
                setClaimTxError('');
              } else if (status.isInvalid) {

                setCalling(false);
                setSignCalling(false);
                setClaimCalling(false);
                let sentryMsg = "Claim error: " + "Account: " + accounts[0] + " Address: " + address + " TxId: " + txHash
                    + " Signature: " + sig +  " Error: Invalid transaction";
                Raven.captureException(sentryMsg);
                setClaimTxError('Error: Invalid transaction');
                setToast({
                  text: "Failed: Invalid transaction",
                  type: "error",
                });
              }
            });
          });
        }
      }
      setCalling(false);
      setClaimCalling(false);
    } catch (err) {
      setCalling(false);
      setSignCalling(false);
      setClaimCalling(false);
      let sentryMsg = "Claim error: " + "Account: " + accounts[0] + "Address: " + address + "TxId: " + txHash + " "
          +  err.message;
      Raven.captureException(sentryMsg);
      setClaimTxError('Error: ' + err.message);
      setToast({
        text: "Failed: " + err.message,
        type: "error",
      });
    }
  }

  return (
    <div className="App">
      <Page>
        <Spacer />
        <Page.Header>
          <Text h3 style={{marginTop: '20px'}} >tPHA {t('Swap')}</Text>
          <Text h6 className='links'>
            <Link href='https://phala.network/' color target="_blank">Home</Link>
            <Link href='https://t.me/phalanetwork' color target="_blank">Telegram</Link>
            <Link href='https://discord.com/invite/zjdJ7d844d' color target="_blank">Discord</Link>
          </Text>
        </Page.Header>
        <Page.Content>
          <Col>
            <Row>
              {!provider && <Button icon={<Icon.LogIn/>} auto shadow ghost type="secondary" onClick={connectWeb3} loading={connectCalling} disabled={calling && !connectCalling}>{t('Connect Wallet')}</Button>}
              {provider && (
                  <Row align="middle">
                    <Button icon={<Icon.LogOut/>} auto shadow ghost  type="secondary" onClick={disconnectWeb3} disabled={calling}>{t('Disconnect Wallet')}</Button>
                    <Spacer x={2}/>
                    <Note small label={t('ETH ACCOUNT')}>{accounts[0]}</Note>
                  </Row>
              )}
            </Row>
            {!calling && connectError !== '' && (
                <Col>
                  <Spacer y={0.3} />
                  <Text small type="error">
                    {walletErrorPrefix}
                    <a href={metamaskLink} target="_blank" rel="noreferrer">MetaMask</a>
                    {walletErrorSuffix}
                  </Text>
                </Col>
            )}
            {accounts.length > 0 && (
                <Col>
                  <Divider y={2} />
                  <Spacer y={1} />
                  {tabState === 'burn' && (
                      <Col>
                        <Row>
                          <Button icon={<Icon.Disc/>} auto shadow type="secondary" onClick={tabBurn} disabled={calling}>{t('Burn Tokens')}</Button>
                          <Button icon={<Icon.Circle/>} auto ghost style={{ color:"#888" }} onClick={tabClaim} disabled={calling}>{t('Claim Tokens')}</Button>
                        </Row>
                        <Spacer />
                        <Input readOnly initialValue={0.1} onChange={handleBurnAmount} width="100%">
                          <Text h6>{t('BURN AMOUNT')}</Text>
                        </Input>
                        <Spacer y={0.3} />
                        <Text small type="secondary">{burnAmountNote}</Text>
                        <Spacer />
                        <Button icon={<Icon.FileText />} auto shadow ghost type="secondary" onClick={sendTx} loading={burnCalling} disabled={calling && !burnCalling}>{t('Click To Burn')}</Button>
                        {(burnTxHash !== '' || burnTxLink !== '' || burnTxError !== '' || calling) && <Divider y={2} />}
                        {!burnCalling && burnTxHash !== '' && burnTxError === '' && (
                            <Col>
                              <Input readOnly initialValue={burnTxHash} width="100%">
                                <Text h6>{t('ETH TXID')}</Text>
                              </Input>
                              <Spacer y={0.3} />
                            </Col>
                        )}
                        {!burnCalling && burnTxLink !== '' && burnTxError === '' && (
                            <Col>
                              <Text small type="secondary">
                                {burnTxLinkPrefix}
                                <a href={burnTxLink} target="_blank" rel="noreferrer">Etherscan</a>
                                {burnTxLinkSuffix}
                              </Text>
                            </Col>
                        )}
                        {!burnCalling && burnTxError !== '' && (
                            <Col>
                              <Text small type="error">
                                {burnTxError}
                              </Text>
                            </Col>
                        )}
                      </Col>
                  )}
                  {tabState === 'claim' && (
                      <Col>
                        <Row>
                          <Button icon={<Icon.Circle/>} auto ghost style={{ color:"#888" }} onClick={tabBurn} disabled={calling}>{t('Burn Tokens')}</Button>
                          <Button icon={<Icon.Disc/>} auto shadow type="secondary" onClick={tabClaim} disabled={calling}>{t('Claim Tokens')}</Button>
                        </Row>
                        <Spacer />
                        <Input clearable placeholder={t('0x prefixed hex')} initialValue={txHash} onChange={handleTxHash} width="100%">
                          <Text h6>{t('ETH TXID')}</Text>
                        </Input>
                        <Spacer />
                        <Input clearable placeholder={t('ss58 format')} initialValue={address} onChange={handleAddress} width="100%">
                          <Text h6>{t('PHA RECIPIENT ADDRESS')}</Text>
                        </Input>
                        <Spacer />
                        <Row>
                          <Button icon={<Icon.Repeat />} auto shadow ghost  type="secondary"  onClick={claimTokens} loading={claimCalling} disabled={calling && !claimCalling}>{t('Click To Claim') }</Button>
                        </Row>
                        {(signature !== '' || claimTxLink !== '' || claimTxError !== '' || calling) && <Divider y={2} />}
                        {!signCalling  && signature !== '' && (
                            <Col>
                              <Input readOnly initialValue={signature} width="100%">
                                <Text h6>{t('SIGNATURE')}</Text>
                              </Input>
                              <Spacer y={0.3} />
                            </Col>
                        )}
                        {!claimCalling && claimTxLink !== '' && claimTxError ==='' && (
                            <Col>
                              <Text small type="secondary">
                                {claimTxLinkPrefix}
                                <a href={claimTxLink} target="_blank" rel="noreferrer">Phala PoC-3 Console</a>
                                {claimTxLinkSuffix}
                              </Text>
                            </Col>
                        )}
                        {!claimCalling && claimTxError !== '' && (
                            <Col>
                              <Text small type="error">
                                {claimTxError}
                              </Text>
                            </Col>
                        )}
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
