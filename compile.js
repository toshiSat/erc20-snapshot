const fs = require("fs").promises;
const path = require("path");
var BigNumber = require("bignumber.js");

const cutOff = 1000;
const removeLimit = 4;
const finalRemoveLimit = 10;
const amountToSplit = new BigNumber(4000000);
const minimum = 0.01;
const blacklist = [
  "0x64192819Ac13Ef72bF6b5AE239AC672B43a9AF08",
  "0x73B1714FB3BFaeFA12F3707bEfcBa3205f9A1162",
  "0xF9FB46038a8d9CDd11e14628D19ded145eF5a311",
  "0x4a3826bD2e8a31956Ad0397A49efDE5e0d825238",
  "0xEA8b95C4b07EC651821142910eDe29A52170779c",
  "0xc28CFF6802d11D903A838b8a4777d27870324B60",
  "0x24b0a4081Ab0B3C6C56c0E3D994D4738c73B77E5",
  "0xC9a2F84Cd6a20721e78DDA52AD05905b47b01A21",
  "0x3f31DF519ccD510e919d57A0BFcdEDD181967228",
  "0x1c0a684a45C8AEc7C6Bd6Da94bfaED044EC2Fd88",
  "0x7f291f487a1e9627D28f216C1853db66C9c11985",
  "0xAB4e5b618FB8f1F3503689DFbdf801478fF6C252",
  "0xbebd60D2985594c36eBfa66e44b0856807E9DD32",
  "0x237343C10705ae7605850977503E25a8C12851e6",
  "0x971f723194796dbF04DcFe361ED584CaE9bf94A0",
  "0x99a8C29FcBd397B6110D428d78f5788FcE6956b0",
  "0x14650700FEc5697c014e8332169f93734A6c5741",
  "0x79666F62BF3bDF937Ef1B147343E782f72C3fd2D",
  "0x9cCC2CfC1dA5c2623b9ad74DCF01765eae273539",
  "0xF977814e90dA44bFA03b6295A0616a897441aceC",
  "0x8aed0055D691e6d619AcC96Ad0fB3461f5774646",
  "0xf042c68695c5449f0483f36ec4959ADF40cE6AcE",
  "0xCFFAd3200574698b78f32232aa9D63eABD290703",
  "0xA4fc358455Febe425536fd1878bE67FfDBDEC59a",
  "0xf3B0073E3a7F747C7A38B36B805247B222C302A3",
  "0x46f80018211D5cBBc988e853A8683501FCA4ee9b",
  "0x5FDCCA53617f4d2b9134B29090C87D01058e27e9",
  "0x470e8de2eBaef52014A47Cb5E6aF86884947F08c",
  "0x012480c08d20a14CF3Cb495e942a94dd926DCc8f"
];

const rename = [
  {
    oldWallet: "0xC8bD5e90F3f5F20C34735726A40A88D6C09f4Cea",
    newWallet: "0x0A004D357f586B39A71522E3f7B97799694b4E69"
  },
  {
    oldWallet: "0x90A48D5CF7343B08dA12E067680B4C6dbfE551Be",
    newWallet: "0x7a89f1838933DE0bA50aF0e916050977ceACAC9e"
  }
];

// Function to process the JSON files
async function processJsonFilesETH(fileNames, outputFileName, multipliers) {
  try {
    let results = {};
    let amountSkipped = new BigNumber(0);
    let y = 0;
    for (let index = 0; index < fileNames.length; index++) {
      const filePath = path.join(__dirname, fileNames[index]);
      const data = await fs.readFile(filePath, "utf8");
      const jsonData = JSON.parse(data);
      const multiplier = multipliers[index];
      // Transform and aggregate the data
      jsonData.forEach((item) => {
        const handle = item.wallet;
        const amount = parseFloat(item.balance);
        if (blacklist.includes(handle)) {
          const balance = new BigNumber(amount).times(multiplier);
          amountSkipped = amountSkipped.plus(balance);
        } else if (amount > minimum) {
          if (results[handle]) {
            const balance = new BigNumber(amount).times(multiplier);
            results[handle] = results[handle].plus(balance);
          } else {
            results[handle] = new BigNumber(amount).times(multiplier);
            y++;
          }
        }
      });
    }

    console.log("Amount of results", y);
    // Distribute 4m to holders
    const totalAmount = Object.values(results).reduce((acc, amount) => {
      if (amount.gt(cutOff)) {
        return acc;
      }
      return acc.plus(amount);
    }, new BigNumber(0));

    // Distribute the proportional amount to each result
    for (const handle in results) {
      if (results.hasOwnProperty(handle) && results[handle].lte(cutOff)) {
        // Calculate the percentage of the total
        const percentage = results[handle].dividedBy(totalAmount);

        // Calculate the proportional amount to add
        const proportionalAmount = amountToSplit.times(percentage);

        // Add the proportional amount to the current result
        results[handle] = results[handle].plus(proportionalAmount);
      }
    }

    // add 10 to 50k addresses starting with under 100
    const sortedHandles = Object.entries(results)
      .filter(([handle, amount]) => amount.isLessThan(100)) // Filter amounts under 100
      .sort(([, amountA], [, amountB]) => amountA.comparedTo(amountB)) // Sort by amount
      .slice(0, 50000); // Get the first 50,000 handles

    // Step 2: Add 10 to the amounts of these handles
    sortedHandles.forEach(([handle]) => {
      results[handle] = results[handle].plus(10);
    });

    const totalAmountRemoved = Object.values(results).reduce((acc, amount) => {
      if (amount.gt(removeLimit)) {
        return acc;
      }
      return acc.plus(amount);
    }, new BigNumber(0));
    console.log("Total amount Removed:", totalAmountRemoved.toString());

    // Distribute the proportional amount to each result
    for (const handle in results) {
      if (results.hasOwnProperty(handle) && results[handle].lte(removeLimit)) {
        delete results[handle];
      }
    }

    const totalAmountAfterDelete = Object.values(results).reduce((acc, amount) => {
      if (amount.gt(cutOff)) {
        return acc;
      }
      return acc.plus(amount);
    }, new BigNumber(0));

    for (const handle in results) {
      if (results.hasOwnProperty(handle) && results[handle].lte(cutOff)) {
        // Calculate the percentage of the total
        const percentage = results[handle].dividedBy(totalAmountAfterDelete);

        // Calculate the proportional amount to add
        const proportionalAmount = totalAmountRemoved.times(percentage);

        // Add the proportional amount to the current result
        results[handle] = results[handle].plus(proportionalAmount);
      }
    }

    // Remove under 10 and distribute
    const totalAmountRemovedFinal = Object.values(results).reduce((acc, amount) => {
      if (amount.gt(finalRemoveLimit)) {
        return acc;
      }
      return acc.plus(amount);
    }, new BigNumber(0));
    console.log("Total amount Removed Final:", totalAmountRemovedFinal.toString());

    for (const handle in results) {
      if (results.hasOwnProperty(handle) && results[handle].lte(finalRemoveLimit)) {
        delete results[handle];
      }
    }

    const totalAmountFinal = Object.values(results).reduce((acc, amount) => {
      return acc.plus(amount);
    }, new BigNumber(0));

    for (const handle in results) {
      if (results.hasOwnProperty(handle)) {
        // Calculate the percentage of the total
        const percentage = results[handle].dividedBy(totalAmountFinal);

        // Calculate the proportional amount to add
        const proportionalAmount = totalAmountRemovedFinal.times(percentage);

        // Add the proportional amount to the current result
        results[handle] = results[handle].plus(proportionalAmount);
      }
    }

    // Convert the results object back to an array of objects
    const outputData = Object.entries(results)
      .map(([handle, amount]) => {
        const scaledAmount = amount;
        return {
          handle,
          amount: scaledAmount // Keep as BigNumber for sorting
        };
      })
      .sort((a, b) => {
        return b.amount.comparedTo(a.amount); // Sort by amount as BigNumber
      })
      .map((item) => {
        return {
          handle: item.handle,
          amount: item.amount.toString() // Convert back to string after sorting
        };
      });

    // Rename the wallets
    rename.forEach((item) => {
      const oldWallet = item.oldWallet;
      const newWallet = item.newWallet;
      const oldIndex = outputData.findIndex((item) => item.handle === oldWallet);
      if (oldIndex !== -1) {
        outputData[oldIndex].handle = newWallet;
      }
    });

    // Write the transformed data to the output file
    const outputFilePath = path.join(__dirname, outputFileName);
    await fs.writeFile(outputFilePath, JSON.stringify(outputData, null, 2), "utf8");
    console.log(`Successfully written to ${outputFileName}`);
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

async function processSolFiles(solFileName, solAtlasFileName, outputFileName) {
  try {
    let results = {};

    // Process the SOL file
    const solFilePath = path.join(__dirname, solFileName);
    const solData = await fs.readFile(solFilePath, "utf8");
    const solWallets = JSON.parse(solData);

    solWallets.forEach((wallet) => {
      results[wallet] = new BigNumber(100);
    });

    // Process the SOL_ATLAS file
    const solAtlasFilePath = path.join(__dirname, solAtlasFileName);
    const solAtlasData = await fs.readFile(solAtlasFilePath, "utf8");
    const solAtlasEntries = JSON.parse(solAtlasData);

    solAtlasEntries.forEach((item) => {
      const handle = item.owner;
      const amount = new BigNumber(item.amount).times(0.00000905);
      if (item.amount > minimum) {
        if (results[handle]) {
          results[handle] = results[handle].plus(amount);
        } else {
          results[handle] = amount;
        }
      }
    });

    // Convert the results object back to an array of objects
    const outputData = Object.entries(results)
      .sort((a, b) => b[1].comparedTo(a[1])) // Sort by amount
      .map(([handle, amount]) => ({
        handle,
        amount: amount.toString() // Convert back to string
      }));

    // Write the transformed data to the output file
    const outputFilePath = path.join(__dirname, outputFileName);
    await fs.writeFile(outputFilePath, JSON.stringify(outputData, null, 2), "utf8");
    console.log(`Successfully written to ${outputFileName}`);
  } catch (error) {
    console.error("Error processing files:", error);
  }
}

// Example usage
const solFileName = "./balances/SOL.json";
const solAtlasFileName = "./balances/SOL_ATLAS.json";
const solOutputFileName = "whitelist.json";

processSolFiles(solFileName, solAtlasFileName, solOutputFileName);

// Example usage
const inputFiles = ["./balances/AXS.json", "./balances/FOX.json", "./balances/GODS.json", "./balances/PRIME.json"];
const multipliers = [0.0235, 0.000212, 0.00068, 0.036];
const outputFileName = "eth-whitelist.json";

processJsonFilesETH(inputFiles, outputFileName, multipliers);
