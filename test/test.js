const { expect } = require('chai');
const { ethers } = require('hardhat');

let tokenAddress = '';
let marketAddress = '';
let nftAddress = '';
let main;
let buyer;
let holder;
let token;
let market;
let nft;
let listingFee;
let adminAddress;

const testNftPrice = ethers.utils.parseUnits('0.01', 'ether');

describe('Deployment', () => {
	it('deploy token contract', async () => {
		const Token = await ethers.getContractFactory('Token');
		token = await Token.deploy();
		await token.deployed();
		tokenAddress = token.address;
		console.log(token.address);
	});

	it('deploy market contract', async () => {
		const Market = await ethers.getContractFactory('Market');
		adminAddress = (await ethers.getSigners())[9].address;
		market = await Market.deploy(tokenAddress, adminAddress);
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

describe('Token', async () => {
	before(async () => {
		[main, buyer, holder] = await ethers.getSigners();
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

		await token.connect(holder).approve(main.address, amount);
		await token.connect(holder).transfer(main.address, amount);

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
				await token.approve(marketAddress, listingFee);
				await market.listToken(nftAddress, id, testNftPrice);
				const listing = await market.getListing(id);
				expect(listing.token).to.equal(nftAddress);
				expect(listing.status).to.equal(0);
			})
		);
		const listings = await market.getListings();
		expect(listings.length).to.equal(IDS.length);
	});

	it('buy item', async () => {
		const listing = await market.getListing(0);
		await token.connect(buyer).approve(marketAddress, listing.price);
		await market.connect(buyer).buyToken(listing.id);
		const updatedListing = await market.getListing(listing.id);
		expect(updatedListing.owner).to.equal(buyer.address);
		expect(updatedListing.status).to.equal(1);
	});

	it('list item again after buying', async () => {
		await market.connect(buyer).listToken(nftAddress, 0, testNftPrice);
		const listing = await market.getListing(0);
		expect(listing.status).to.equal(0);
		const listings = await market.getListings();
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const ID = 2;
		await nft.mint('http://example.com/3');
		await market.listToken(nftAddress, ID, testNftPrice);
		await market.cancel(ID);
		const listing = await market.getListing(ID);
		expect(listing.status).to.equal(1);
	});

	it('cannot list a token owned by someone else', async () => {
		try {
			await market.listToken(nftAddress, 1, testNftPrice);
		} catch (error) {
			expect(error.message.includes('listing can be done only by owner')).to.equal(true);
		}
	});

	it('cannot cancel a token owned by someone else', async () => {
		try {
			await market.connect(buyer).cancel(1);
		} catch (error) {
			expect(error.message.includes('only owner can cancel listing')).to.equal(true);
		}
	});

	it('cannot buy an owned item', async () => {
		try {
			await market.buyToken(1);
		} catch (error) {
			expect(error.message.includes('owner cannot be buyer')).to.equal(true);
		}
	});

	it('cannot buy an inactive item', async () => {
		try {
			await market.connect(buyer).buyToken(2);
		} catch (error) {
			expect(error.message.includes('listing is not active')).to.equal(true);
		}
	});

	it('catch insufficient listing fee', async () => {
		try {
			const account = (await ethers.getSigners())[3];
			await nft.connect(account).mint(`http://example.com/4`);
			await market.connect(account).listToken(nftAddress, 3, testNftPrice);
			await market.connect(account).buyToken(1);
		} catch (error) {
			expect(error.message.includes('balance too low for listing fee')).to.equal(true);
		}
	});

	it('catch low balance for buy payment', async () => {
		try {
			const account = (await ethers.getSigners())[3];
			await market.connect(account).buyToken(1);
		} catch (error) {
			expect(error.message.includes('balance too low')).to.equal(true);
		}
	});
});
