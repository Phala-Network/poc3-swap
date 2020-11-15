import React, { Suspense, useState, useRef} from 'react';
import { GeistProvider, CssBaseline, Button, Spacer, Divider, Link, Page, Row, Col, Text, Input, useMediaQuery, useToasts} from '@geist-ui/react'
import * as Icon from '@geist-ui/react-icons'
import { decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex } from '@polkadot/util';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { useTranslation } from 'react-i18next';
import Web3 from "web3";
import Web3Modal from "web3modal";
import { etherscanBase, phalaBase, wsEndPoint, loadPhalaTokenContract } from './config';
import { burnMsg, burnAmountNote } from './msg';

import './App.css';

const types = require('./typedefs.json');
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

  // Web3 connection
  const [provider, setProvider] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [state, setState] = useState('notconnected');
  const connectWeb3 = async() => {
    try {
      setCalling(true);
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
        setTabState('burn');
        setCalling(false);
        setCalling(false);
      }
    } catch (err) {
      setCalling(false);
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
    setTabState('burn');
    setAccounts([]);
    setCalling(false);
  }

  // error
  const [toasts, setToast] = useToasts()

  // tab
  const [tabState, setTabState] = useState('burn');
  const [calling, setCalling] = useState(false);

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

  // claim tokens
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
  const [signature, setSignature] = useState('');
  const sig = useRef(null)
  const signMsg = async() => {
    let result = '';
    try {
      setCalling(true);
      if(address.length === 48 && txHash.length === 66) {
        let tAddress = u8aToHex(decodeAddress(address));
        tAddress = tAddress.substr(2, tAddress.length-2);
        let tTxHash = txHash.substr(2, txHash.length-2);
        let msg = tAddress + tTxHash;
        const web3Instance = new Web3(provider);
        const prefix = web3Instance.utils.utf8ToHex("\x19Ethereum Signed Message:\n" + (msg.length/2))
        result = await web3Instance.eth.sign(web3Instance.utils.sha3(prefix + msg), accounts[0]);
        setSignature(result);
        setToast({
          text: "Success",
          type: "success",
        });
      }
      else {
        setToast({
          text: "Failed: Invalid address or txHash format",
          type: "error",
        });
      }
      setCalling(false);
    } catch (err) {
      setCalling(false);
      setToast({
        text: "Failed: " + err.message,
        type: "error",
      });
    }
    sig && (sig.current.value = result)
  }
  const [claimTxLink, setClaimTxLink] = useState('');

  const claimTokens = async() => {
    try {
      setCalling(true);
      if(address.length !== 48 || txHash.length !== 66) {
        u8aToHex(decodeAddress(address));
        setToast({
          text: "Failed: Invalid address or txHash format",
          type: "error",
        });
      } else if(signature === '') {
        setToast({
          text: "Failed: No signature",
          type: "error",
        });
      } else {
        const wsProvider = new WsProvider(wsEndPoint);
        const api = await ApiPromise.create({provider: wsProvider, types});
        await cryptoWaitReady();
        const txInfo = await api.query.phaClaim.burnedTransactions(txHash);
        const isClaimed = await api.query.phaClaim.claimState(txHash);
        console.log(isClaimed.toString())
        if(txInfo[0].toString() === '0x0000000000000000000000000000000000000000') {
          setToast({
            text: "Failed: Your txHash is in crawling, please wait 2 minutes",
            type: "error",
          });
        } else if (isClaimed.toString() === 'true'){
          setToast({
            text: "Failed: This txHash has been claimed",
            type: "error",
          });
        } else {
          const claimTx = api.tx.phaClaim.claimErc20Token(address, txHash, signature);
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
                  text: `Success included in ${status.asInBlock.toHex()}`,
                  type: "success",
                });
              } else if (status.isInvalid) {
                throw new Error('Invalid transaction');
              }
            });
          });
        }
      }
      setCalling(false);
    } catch (err) {
      setCalling(false);
      setToast({
        text: "Failed: " + err.message,
        type: "error",
      });
    }
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
  const [burnTxHash, setBurnTxHash] = useState('');
  const tx = useRef(null);
  const [burnTxLink, setBurnTxLink] = useState('');
  const sendTx = async() => {
    alert(burnMsg);
    let result = '';
    try {
      setCalling(true);
      const web3Instance = new Web3(provider);
      const contract = loadPhalaTokenContract(web3Instance);
      let amount = web3Instance.utils.toWei(burnAmount.toString());
      const receipt = await contract.methods.transfer(toAddress, amount)
          .send({from: accounts[0]});
      setTxHash(receipt.transactionHash);
      setBurnTxHash(receipt.transactionHash)
      setBurnTxLink(etherscanBase + '/tx/' + receipt.transactionHash);
      setToast({
        text: "Success",
        type: "success",
      });
      result = receipt.transactionHash;
      setCalling(false);
    } catch (err) {
      setCalling(false);
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
          <Text h3 style={{marginTop: '40px'}} color>tPHA {t('Swap')}</Text>
          <Text h6 className='links'>
            <Link href='https://phala.network/' color target="_blank">Home</Link>
            <Link href='https://t.me/phalanetwork' color target="_blank">Telegram</Link>
            <Link href='https://discord.com/invite/zjdJ7d844d' color target="_blank">Discord</Link>
          </Text>
        </Page.Header>
        <Page.Content>
          <Col>
            <Row>
            {!provider && <Button icon={<Icon.LogIn/>} auto shadow ghost  type="secondary" onClick={connectWeb3} disabled={calling}>{t('Connect Wallet')}</Button>}
            {provider && <Button icon={<Icon.LogOut/>} auto shadow ghost  type="secondary" onClick={disconnectWeb3} disabled={calling}>{t('Disconnect Wallet')}</Button>}
            </Row>
            {accounts.length > 0 && (
                <Col>
                  <Spacer />
                  <Text h6 type="secondary" >{t('ETH ACCOUNT: ') + accounts[0]}</Text>
                  <Divider y={0} />
                  <Spacer y={1.5} />
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
                        <Text h6 type="secondary">{burnAmountNote}</Text>
                        {/*<Spacer />*/}
                        {/*<Input readOnly placeholder={t('')} initialValue={'0x000000000000000000000000000000000000dead'} onChange={handleToAddress} width="100%">*/}
                        {/*  <Description title={t('Burn ToAddress')}/>*/}
                        {/*</Input>*/}
                        <Spacer y={1.5} />
                        <Button icon={<Icon.FileText />} auto shadow ghost type="secondary" onClick={sendTx} disabled={calling}>{t('Send Transaction')}</Button>
                        <Spacer/>
                        <Input readOnly initialValue={burnTxHash} onChange={e => console.log(e.target.value)} ref={tx} width="100%">
                          <Text h6>{t('ETH TXHASH')}</Text>
                        </Input>
                        <Spacer />
                        {burnTxLink !== '' && (
                            <Row>
                              <Text small>
                                <Link href={burnTxLink} color target="_blank"> {burnTxLink} </Link>
                              </Text>
                            </Row>
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
                          <Text h6>{t('ETH TXHASH')}</Text>
                        </Input>
                        <Spacer />
                        <Input clearable placeholder={t('ss58 format')} initialValue={address} onChange={handleAddress} width="100%">
                          <Text h6>{t('PHA RECIPIENT ADDRESS')}</Text>
                        </Input>
                        <Spacer y={1.5} />
                        <Row>
                          <Button icon={<Icon.Edit3 />} auto shadow ghost  type="secondary"  onClick={signMsg} disabled={calling}>{t('Sign Message') }</Button>
                          <Spacer x = {1}/>
                          <Button icon={<Icon.Repeat />} auto shadow ghost  type="secondary"  onClick={claimTokens} disabled={calling}>{t('Claim') }</Button>
                        </Row>
                        <Spacer />
                        <Input readOnly initialValue={signature} onChange={e => console.log(e.target.value)} ref={sig} width="100%">
                          <Text h6>{t('SIGNATURE')}</Text>
                        </Input>
                        <Spacer />
                        {claimTxLink !== '' && (
                            <Row>
                              <Text small>
                                <Link href={claimTxLink} color target="_blank"> {claimTxLink} </Link>
                              </Text>
                            </Row>
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
