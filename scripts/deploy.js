const { ethers } = require('hardhat');

export async function deploy(contract) {
	try {
		const Contract = await ethers.getContractFactory(contract);
		const contract = await Contract.deploy();
		console.log(`Contract "${contract}" deployed to:`, contract.address);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}
