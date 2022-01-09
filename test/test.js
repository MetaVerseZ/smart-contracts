const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Deployment', () => {
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
		const amount = ethers.utils.parseUnits('5000', 'ether');

		await token.connect(holder).approve(main.address, amount);
		await token.connect(holder).transfer(main.address, amount);

		await token.connect(holder).approve(buyer.address, amount);
		await token.connect(holder).transfer(buyer.address, amount);

		const mainBalance = ethers.utils.formatEther(await token.balanceOf(main.address));
		expect(mainBalance).to.equal(ethers.utils.formatEther(amount));
	});
});

describe('Transactions', async () => {
	before(async () => (listingFee = (await market.getListingFee()).toString()));

	const testNftPrice = ethers.utils.parseUnits('500', 'ether');

	it('mint and list items', async () => {
		const IDS = [0, 1];
		await Promise.all(
			IDS.map(async id => {
				await nft.mint(`http://example.com/${id}`);
				await token.approve(market.address, listingFee);
				await market.listToken(nft.address, id, testNftPrice);
				const listing = await market.getListing(id);
				expect(listing.token).to.equal(nft.address);
				expect(listing.status).to.equal(0);
			})
		);
		const listings = await market.getListings();
		expect(listings.length).to.equal(IDS.length);
	});

	it('buy item', async () => {
		const listing = await market.getListing(0);
		await token.connect(buyer).approve(market.address, listing.price);
		await market.connect(buyer).buyToken(listing.id);
		const updatedListing = await market.getListing(listing.id);
		expect(updatedListing.owner).to.equal(buyer.address);
		expect(updatedListing.status).to.equal(1);
	});

	it('list item again after buying', async () => {
		await market.connect(buyer).listToken(nft.address, 0, testNftPrice);
		const listing = await market.getListing(0);
		expect(listing.status).to.equal(0);
		const listings = await market.getListings();
		expect(listings.length).to.equal(2);
	});

	it('cancel item listing', async () => {
		const ID = 2;
		await nft.mint('http://example.com/3');
		await market.listToken(nft.address, ID, testNftPrice);
		await market.cancel(ID);
		const listing = await market.getListing(ID);
		expect(listing.status).to.equal(1);
	});

	it('check owned items', async () => {
		const mainOwnedItems = (await nft.getAccountItems(main.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		const buyerOwnedItems = (await nft.getAccountItems(buyer.address)).map(e => parseInt(ethers.utils.formatUnits(e, 0)));
		expect(mainOwnedItems.length).to.equal(2);
		expect(buyerOwnedItems.length).to.equal(1);
		expect(mainOwnedItems.every(item => [1, 2].includes(item)) && [1, 2].every(item => mainOwnedItems.includes(item))).to.equal(true);
		expect(buyerOwnedItems.every(item => [0].includes(item)) && [0].every(item => buyerOwnedItems.includes(item))).to.equal(true);
	});

	it('cannot list a token owned by someone else', async () => {
		try {
			await market.listToken(nft.address, 1, testNftPrice);
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
			await market.connect(account).listToken(nft.address, 3, testNftPrice);
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

	after(() => {
		console.log('Token address:', token.address);
		console.log('Merket address:', market.address);
		console.log('NFT address:', nft.address);
	});
});
