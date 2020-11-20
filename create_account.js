require("dotenv").config();

const near = require("near-api-js");
const fs = require("fs");

const credentialsPath = "./credentials";

const UnencryptedFileSystemKeyStore = near.keyStores.UnencryptedFileSystemKeyStore;
const keyStore = new UnencryptedFileSystemKeyStore(credentialsPath);

const options = {
    networkId:  process.env.NEAR_NETWORK,
    nodeUrl:    process.env.NEAR_NODE_URL,
    walletUrl:  `https://wallet.${process.env.NEAR_NETWORK}.near.org`,
    helperUrl:  `https://helper.${process.env.NEAR_NETWORK}.near.org`,
    explorerUrl:`https://explorer.${process.env.NEAR_NETWORK}.near.org`,
    accountId:  process.env.NEAR_ACCOUNT,
    keyStore:   keyStore
}

async function main() {
    let keyPair;

    const client = await near.connect(options);

    const keyRootPath = client.connection.signer.keyStore.keyDir;
    const keyFilePath = `${keyRootPath}/${options.networkId}/${options.accountId}.json`

    if (!fs.existsSync(keyFilePath)) {
        console.log("Generating new key pair");
        keyPair = near.KeyPair.fromRandom("ed25519");
    } else {
        let content = JSON.parse(fs.readFileSync(keyFilePath).toString());
        keyPair = near.KeyPair.fromString(content.private_key);

        console.log(`Key pair for account ${options.accountId} already exists, skipping creation`);
    }

    await client.connection.signer.keyStore.setKey(options.networkId, options.accountId, keyPair);

    // Determine if account already exists
    try {
        await client.account(options.accountId);
        return console.log(`Sorry, account '${options.accountId}' already exists.`);
    } catch (e) {
        if (!e.message.includes("does not exist while viewing")) {
            throw e;
        }
    }

    const publicKey = keyPair.getPublicKey()

    try {
        const response = await client.createAccount(options.accountId, publicKey);
        console.log(`Account ${response.accountId} for network "${options.networkId}" was created.`);
        console.log("------------------------------------------------------------------------");
        console.log("OPEN LINK BELOW to see account in NEAR Explorer!");
        console.log(`${options.explorerUrl}/accounts/${response.accountId}`);
        console.log("------------------------------------------------------------------------");
    } catch (error) {
        console.log("ERROR:", error);
    }
}

main();