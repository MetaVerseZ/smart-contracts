const { expect } = require('chai');
const { ethers } = require('hardhat');

let marketAddress = '';
let nftAddress = '';
let buyerAddress = '';
let market;
let nft;
let listingFee;

const testNftPrice = ethers.utils.parseUnits('0.01', 'ether');

describe('Deployment', () => {
	it('deploy market contract', async () => {
		const Market = await ethers.getContractFactory('Market');
		market = await Market.deploy();
		await market.deployed();
		marketAddress = market.address;
	});

	it('deploy nft contract', async () => {
		const NFT = await ethers.getContractFactory('NFT');
		nft = await NFT.deploy(marketAddress);
		await nft.deployed();
		nftAddress = nft.address;
	});
});

describe('Transactions', async () => {
	before(async () => {
		const [_, addr] = await ethers.getSigners();
		buyerAddress = addr;
		listingFee = await market.getListingFee();
	});

	it('mint and list item', async () => {
		await nft.mint('http://example.com');
		await market.listToken(nftAddress, 0, testNftPrice, { value: listingFee.toString() });
		const listing = await market.getListing(0);
		expect(listing.token).to.equal(nftAddress);
		expect(listing.status).to.equal(0);
	});

	it('buy item', async () => {
		await market.connect(buyerAddress).buyToken(0, { value: testNftPrice });
		const listing = await market.getListing(0);
		expect(listing.owner).to.equal(buyerAddress.address);
		expect(listing.status).to.equal(1);
	});

	it('cancel item listing', async () => {
		await nft.mint('http://example.com/2');
		await market.listToken(nftAddress, 1, testNftPrice, { value: listingFee.toString() });
		await market.cancel(1);
		const listing = await market.getListing(1);
		expect(listing.token).to.equal(nftAddress);
		expect(listing.status).to.equal(2);
	});
});
