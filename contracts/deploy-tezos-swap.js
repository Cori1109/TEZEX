const conseiljs = require("conseiljs");
const config = require("./config.json");
const tezosConfig = require("./tezos/build/TezosSwap/step_000_cont_1_contract.json");
const log = require("loglevel");
const conSign = require("conseiljs-softsigner");
const fetch = require("node-fetch");
const Web3 = require("web3");

const init = async () => {
  const logger = log.getLogger("conseiljs");
  logger.setLevel("error", false);
  const store = {};
  store.keyStore = await conSign.KeyStoreUtils.restoreIdentityFromSecretKey(
    config.tezos.privateKey
  );
  store.signer = await conSign.SoftSigner.createSigner(
    conseiljs.TezosMessageUtils.writeKeyWithHint(
      store.keyStore.secretKey,
      "edsk"
    )
  );
  //   console.log(store.keyStore);
  conseiljs.registerFetch(fetch);
  conseiljs.registerLogger(logger);
  const web3 = new Web3(new Web3.providers.HttpProvider(config.ethereum.RPC));
  return { store, web3 };
};

const estimateFees = async (store, web3) => {
  try {
    const fa12Estimate =
      await conseiljs.TezosNodeWriter.testContractDeployOperation(
        config.tezos.RPC,
        config.tezos.chain_id,
        store.keyStore,
        0,
        undefined,
        100000,
        10000,
        20000,
        trim(tezosConfig),
        conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(
          `(Pair (Pair False (Pair "${store.keyStore.publicKeyHash}" 0)) (Pair (Pair {} 15) (Pair {} 0)))`
        ),
        conseiljs.TezosParameterFormat.Micheline
      );

    console.log(
      `\nFee Estimates:\n\n- Tesoz Fee Required : ${
        (fa12Estimate["estimatedFee"] + fa12Estimate["estimatedStorageBurn"]) /
        1000000
      }`
    );
  } catch (err) {
    console.log("[x] Failed to estimate deploy fees : ", err);
  }
};
const trim = (obj) => {
  const str = JSON.stringify(obj);
  const temp = str
    .replace(" ", "")
    .replace(/\\"/g, '"')
    .replace(/[\n\t\r]/, "");
  return temp;
};

const deployTezosContract = async (code, storage, store) => {
  const fee = await conseiljs.TezosNodeWriter.testContractDeployOperation(
    config.tezos.RPC,
    config.tezos.chain_id,
    store.keyStore,
    0,
    undefined,
    100000,
    10000,
    20000,
    trim(code),
    conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(storage),
    conseiljs.TezosParameterFormat.Micheline
  );
  const result =
    await conseiljs.TezosNodeWriter.sendContractOriginationOperation(
      config.tezos.RPC,
      store.signer,
      store.keyStore,
      0,
      undefined,
      fee["estimatedFee"],
      fee["storageCost"],
      fee["gas"],
      trim(code),
      conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(storage),
      conseiljs.TezosParameterFormat.Micheline,
      conseiljs.TezosConstants.HeadBranchOffset,
      true
    );
  const groupid = result["operationGroupID"]
    .replace(/"/g, "")
    .replace(/\n/, ""); // clean up RPC output
  console.log(`Injected operation group id ${groupid}`);
  const conseilResult =
    await conseiljs.TezosConseilClient.awaitOperationConfirmation(
      config.tezos.conseilServer,
      config.tezos.conseilServer.network,
      groupid,
      2
    );
  return conseilResult["originated_contracts"];
};

const deploy = async (store, web3) => {
  try {
    console.log("\nContract Addresses :");
    const tezosSwapContract = await deployTezosContract(
      tezosConfig,
      `(Pair (Pair True (Pair "${store.keyStore.publicKeyHash}" 0)) (Pair (Pair {} 45) (Pair {} 0)))`,
      store
    );
    console.log(`- Tezos Swap contract at ${tezosSwapContract}`);
  } catch (err) {
    console.log("[x] Failed to deploy contracts : ", err);
  }
};

const run = async (estimate = true) => {
  const { store, web3 } = await init();
  await estimateFees(store, web3);
  if (!estimate) {
    await deploy(store, web3);
  }
};

run(false);
