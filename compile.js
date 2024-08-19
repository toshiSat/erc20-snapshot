const fs = require("fs").promises;
const path = require("path");
var BigNumber = require("bignumber.js");

const minimum = 0.01;

// Function to process the JSON files
async function processJsonFilesETH(fileNames, outputFileName, multipliers) {
  try {
    let results = {};

    for (let index = 0; index < fileNames.length; index++) {
      const filePath = path.join(__dirname, fileNames[index]);
      const data = await fs.readFile(filePath, "utf8");
      const jsonData = JSON.parse(data);
      const multiplier = multipliers[index];
      // Transform and aggregate the data
      jsonData.forEach((item) => {
        const handle = item.wallet;
        const amount = parseFloat(item.balance);
        if (amount > minimum) {
          if (results[handle]) {
            const balance = new BigNumber(amount).times(multiplier);
            results[handle] = results[handle].plus(balance);
          } else {
            results[handle] = new BigNumber(amount).times(multiplier);
          }
        }
      });
    }
    // Convert the results object back to an array of objects
    const outputData = Object.entries(results)
      .map(([handle, amount]) => {
        const scaledAmount = amount.times(new BigNumber(10).pow(9)).integerValue(BigNumber.ROUND_DOWN);
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
      results[wallet] = new BigNumber(100).times(new BigNumber(10).pow(9)).integerValue(BigNumber.ROUND_DOWN);
    });

    // Process the SOL_ATLAS file
    const solAtlasFilePath = path.join(__dirname, solAtlasFileName);
    const solAtlasData = await fs.readFile(solAtlasFilePath, "utf8");
    const solAtlasEntries = JSON.parse(solAtlasData);

    solAtlasEntries.forEach((item) => {
      const handle = item.owner;
      const amount = new BigNumber(item.amount).times(0.00000905).times(new BigNumber(10).pow(9)).integerValue(BigNumber.ROUND_DOWN);
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
