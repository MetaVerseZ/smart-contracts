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
		await item.setAdmins([main.address, admin.address]);
	});

	it('deploy land contract', async () => {
		const Land = await ethers.getContractFactory('Land');
		land = await Land.deploy();
		await land.deployed();
		await land.setAdmins([main.address, admin.address]);
	});

	it('deploy market contracts', async () => {
		const ERC1155Market = await ethers.getContractFactory('ERC1155Market');
		const LandMarket = await ethers.getContractFactory('LandMarket');

		erc1155market = await ERC1155Market.deploy(token.address, 10, item.address);
		landmarket = await LandMarket.deploy(token.address, 10, land.address);

		await erc1155market.deployed();
		await landmarket.deployed();

		await erc1155market.setAdmins([main.address, admin.address]);
		await landmarket.setAdmins([main.address, admin.address]);

		await item.setMarket(erc1155market.address);
		await land.setMarket(landmarket.address);
	});
};

module.exports = test;
