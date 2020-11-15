const burnWarning = "You are going to BURN 0.1PHA tokens on Ethereum. Once it's done, you will be able to claim 100 tPHA on Phala PoC-3 testnet. As a result, you will exchange the burned token 1:1000 to testnet PHA.\n" +
    "\nWarning: tPHA is worth ZERO and will NOT be converted to any real tradable token in the future. tPHA is only for testing purpose. You CANNOT change tPHA back to ERC20 PHA as well.\n" +
    "\nPhala added this design to prevent spam miners and fake competition in Miner Race Ranking.";

const burnAmountNote = "The amount is restricted to 0.1 PHA on the UI to avoid accidental asset loss. Ask in our Discord if you want swap more."
const burnTxLinkPrefix = "You can find your burning transaction id on ";
const burnTxLinkSuffix = ". You can claim the swapped tPHA only after the transaction is confirmed on the Ethereum blockchain.";
const claimTxLinkPrefix = "Successfully claimed. You can check you balance at ";
const claimTxLinkSuffix = ".";

export {
    burnWarning,
    burnAmountNote,
    burnTxLinkPrefix,
    burnTxLinkSuffix,
    claimTxLinkPrefix,
    claimTxLinkSuffix,
};
