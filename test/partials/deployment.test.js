const { ethers } = require('hardhat');

const test = () => {
	it('deploy token contract', async () => {
		const Token = await ethers.getContractFactory('Token');
		token = await Token.deploy();
		await token.deployed();
	});

	it('deploy item contract', async () => {
		const Item = await ethers.getContractFactory('Item');
		const signers = await ethers.getSigners();
		main = signers[0];
		admin = signers[9];
		item = await Item.deploy();
		await item.deployed();
	});

	it('deploy land contract', async () => {
		const Land = await ethers.getContractFactory('Land');
		land = await Land.deploy();
		await land.deployed();
	});

	it('deploy market contract', async () => {
		const Market = await ethers.getContractFactory('Market');
		market = await Market.deploy(token.address, 10, item.address, land.address);
		await market.deployed();
		await item.setMarket(market.address);
		await land.setMarket(market.address);
		await market.setAdmins([main.address, admin.address]);
	});
};

module.exports = test;
