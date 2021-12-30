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
		listingFee = (await market.getListingFee()).toString();
	});

	it('mint and list items', async () => {
		const IDS = [0, 1];
		await Promise.all(IDS.map(async id => {
			await nft.mint(`http://example.com/${id}`);
			await market.listToken(nftAddress, id, testNftPrice, { value: listingFee });
			const listing = await market.getListing(id);
			expect(listing.token).to.equal(nftAddress);
			expect(listing.status).to.equal(0);
		}));
		const listings = await market.getListings();
		expect(listings.length).to.equal(IDS.length);
	});

	it('buy item', async () => {
		await market.connect(buyerAddress).buyToken(0, { value: testNftPrice });
		const listing = await market.getListing(0);
		expect(listing.owner).to.equal(buyerAddress.address);
		expect(listing.status).to.equal(1);
	});

	it('list item again after buying', async () => {
		await market.connect(buyerAddress).listToken(nftAddress, 0, testNftPrice, { value: listingFee });
		const listing = await market.getListing(0);
		expect(listing.status).to.equal(0);
		const listings = await market.getListings();
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const ID = 2;
		await nft.mint('http://example.com/3');
		await market.listToken(nftAddress, ID, testNftPrice, { value: listingFee });
		await market.cancel(ID);
		const listing = await market.getListing(ID);
		expect(listing.status).to.equal(1);
	});

	it('cannot list a token owned by someone else', async () => {
		try {
			await market.listToken(nftAddress, 1, testNftPrice, { value: listingFee });
		} catch (error) {
			expect(error.message.includes('Listing can be done only by owner')).to.equal(true);
		}
	});

	it('cannot cancel a token owned by someone else', async () => {
		try {
			await market.connect(buyerAddress).cancel(1);
		} catch (error) {
			expect(error.message.includes('Only owner can cancel listing')).to.equal(true);
		}
	});

	it('cannot buy an owned item', async () => {
		try {
			await market.buyToken(1, { value: testNftPrice });
		} catch (error) {
			expect(error.message.includes('Owner cannot be buyer')).to.equal(true);
		}
	});

	it('cannot buy an inactive item', async () => {
		try {
			await market.connect(buyerAddress).buyToken(2, { value: testNftPrice });
		} catch (error) {
			expect(error.message.includes('Listing is not active')).to.equal(true);
		}
	});

	it('catch insufficient payment', async () => {
		try {
			await market.connect(buyerAddress).buyToken(1, { value: 1 });
		} catch (error) {
			expect(error.message.includes('Insufficient payment')).to.equal(true);
		}
	});
});
