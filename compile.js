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
        if (handle == "0xF977814e90dA44bFA03b6295A0616a897441aceC") console.log({ amount });
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

// Example usage
const inputFiles = ["./balances/AXS.json", "./balances/FOX.json", "./balances/GODS.json", "./balances/PRIME.json"];
const multipliers = [0.0235, 0.000212, 0.00068, 0.036];
const outputFileName = "eth-whitelist.json";

processJsonFilesETH(inputFiles, outputFileName, multipliers);
