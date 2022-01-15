const { ethers } = require('hardhat');

const test = () => {
	it('deploy token contract', async () => {
		const Token = await ethers.getContractFactory('Token');
		token = await Token.deploy();
		await token.deployed();
	});

	it('deploy market contract', async () => {
		const Market = await ethers.getContractFactory('Market');
		admin = (await ethers.getSigners())[9];
		market = await Market.deploy(token.address, admin.address);
		await market.deployed();
	});

	it('deploy nft contract', async () => {
		const NFT = await ethers.getContractFactory('NFT');
		nft = await NFT.deploy(market.address);
		await nft.deployed();
	});
};

module.exports = test;
