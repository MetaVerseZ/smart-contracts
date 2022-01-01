const { expect } = require('chai');
const { ethers } = require('hardhat');

let tokenAddress = '';
let marketAddress = '';
let nftAddress = '';
let buyer;
let holder;
let token;
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

	it('deploy token contract', async () => {
		const Token = await ethers.getContractFactory('Token');
		token = await Token.deploy();
		await token.deployed();
		tokenAddress = token.address;
	});
});

describe('Token', async () => {
	before(async () => {
		[_, buyer, holder] = await ethers.getSigners();
	});

	it('token created and balance sent to holder', async () => {
		const totalSupply = await token.totalSupply();
		await token.approve(holder.address, totalSupply);
		await token.transfer(holder.address, totalSupply);

		const tokenTotalSupply = ethers.utils.formatEther(totalSupply);
		const marketBalance = ethers.utils.formatEther(await token.balanceOf(holder.address));
		expect(marketBalance).to.equal(tokenTotalSupply);
	});

	it('send some tokens to an address', async () => {
		const amount = ethers.utils.parseUnits('20', 'ether');
		await token.connect(holder).approve(buyer.address, amount);
		await token.connect(holder).transfer(buyer.address, amount);

		const buyerBalance = ethers.utils.formatEther(await token.balanceOf(buyer.address));
		expect(buyerBalance).to.equal(ethers.utils.formatEther(amount));
	});
});

describe('Transactions', async () => {
	before(async () => (listingFee = (await market.getListingFee()).toString()));

	it('mint and list items', async () => {
		const IDS = [0, 1];
		await Promise.all(
			IDS.map(async id => {
				await nft.mint(`http://example.com/${id}`);
				await market.listToken(nftAddress, id, testNftPrice, { value: listingFee });
				const listing = await market.getListing(id);
				expect(listing.token).to.equal(nftAddress);
				expect(listing.status).to.equal(0);
			})
		);
		const listings = await market.getListings();
		expect(listings.length).to.equal(IDS.length);
	});

	it('buy item', async () => {
		await market.connect(buyer).buyToken(0, { value: testNftPrice });
		const listing = await market.getListing(0);
		expect(listing.owner).to.equal(buyer.address);
		expect(listing.status).to.equal(1);
	});

	it('list item again after buying', async () => {
		await market.connect(buyer).listToken(nftAddress, 0, testNftPrice, { value: listingFee });
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
			await market.connect(buyer).cancel(1);
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
			await market.connect(buyer).buyToken(2, { value: testNftPrice });
		} catch (error) {
			expect(error.message.includes('Listing is not active')).to.equal(true);
		}
	});

	it('catch insufficient payment', async () => {
		try {
			await market.connect(buyer).buyToken(1, { value: 1 });
		} catch (error) {
			expect(error.message.includes('Insufficient payment')).to.equal(true);
		}
	});
});
