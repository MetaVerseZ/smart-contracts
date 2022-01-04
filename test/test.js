const { expect } = require('chai');
const { ethers } = require('hardhat');

let tokenAddress = '';
let marketAddress = '';
let nftAddress = '';
let main;
let buyer;
let holder;
let token;
let presale;
let market;
let nft;
let listingFee;
let admin;
let adminAddress;
let presaleAddress;

const testNftPrice = ethers.utils.parseUnits('0.01', 'ether');

describe('Deployment', () => {
	it('deploy token contract', async () => {
		const Token = await ethers.getContractFactory('Token');
		token = await Token.deploy();
		await token.deployed();
		tokenAddress = token.address;
	});

	it('deploy market contract', async () => {
		const Market = await ethers.getContractFactory('Market');
		admin = (await ethers.getSigners())[9];
		adminAddress = admin.address;
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

	it('deploy presale contract', async () => {
		const Presale = await ethers.getContractFactory('Presale');
		presale = await Presale.deploy(tokenAddress, adminAddress);
		await presale.deployed();
		presaleAddress = presale.address;
	});
});

describe('Token & Presale', async () => {
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

		await token.connect(holder).approve(main.address, amount);
		await token.connect(holder).transfer(main.address, amount);

		await token.connect(holder).approve(presale.address, ethers.utils.parseUnits('100000000', 'ether'));
		await token.connect(holder).transfer(presale.address, ethers.utils.parseUnits('100000000', 'ether'));

		const mainBalance = ethers.utils.formatEther(await token.balanceOf(main.address));
		expect(mainBalance).to.equal(ethers.utils.formatEther(amount));
	});

	it('presale withdraw some', async () => {
		const presaleBalance = await token.balanceOf(presaleAddress);
		await presale.connect(admin).withdraw(ethers.utils.parseEther('50'));
		const adminBalance = await token.balanceOf(admin.address);

		const updatedPresaleBalance = await token.balanceOf(presaleAddress);

		expect(ethers.utils.formatEther(adminBalance)).to.equal('50.0');
		expect(parseFloat(ethers.utils.formatEther(updatedPresaleBalance))).to.equal(parseFloat(ethers.utils.formatEther(presaleBalance)) - 50);
	});

	it('presale withdraw all', async () => {
		await token.connect(admin).approve(presaleAddress, ethers.utils.parseEther('50'));
		await token.connect(admin).transfer(presaleAddress, ethers.utils.parseEther('50'));

		const presaleBalance = await token.balanceOf(presaleAddress);
		await presale.connect(admin).withdrawAll();
		const adminBalance = await token.balanceOf(admin.address);
		const updatedPresaleBalance = await token.balanceOf(presaleAddress);

		expect(ethers.utils.formatEther(adminBalance)).to.equal(ethers.utils.formatEther(presaleBalance));
		expect(ethers.utils.formatEther(updatedPresaleBalance)).to.equal('0.0');
	});

	it('presale rounds', async () => {
		const adminBalance = await token.balanceOf(admin.address);
		await token.connect(admin).approve(presaleAddress, adminBalance);
		await token.connect(admin).transfer(presaleAddress, adminBalance);

		try {
			await presale.connect(buyer).getTokens(buyer.address, { value: ethers.utils.parseEther('0.001') });
		} catch (error) {
			expect(error.message).to.include('presale inactive');
		}

		await presale.connect(admin).setRound('1');
		await presale.connect(buyer).getTokens(buyer.address, { value: ethers.utils.parseEther('0.001') });
		expect(ethers.utils.formatEther(await token.balanceOf(buyer.address))).to.equal('600.0');

		await token.connect(buyer).approve(presaleAddress, ethers.utils.parseEther('600'));
		await token.connect(buyer).transfer(presaleAddress, ethers.utils.parseEther('600'));

		await presale.connect(admin).setRound('2');
		await presale.connect(buyer).getTokens(buyer.address, { value: ethers.utils.parseEther('0.001') });
		expect(ethers.utils.formatEther(await token.balanceOf(buyer.address))).to.equal('500.0');

		await token.connect(buyer).approve(presaleAddress, ethers.utils.parseEther('500'));
		await token.connect(buyer).transfer(presaleAddress, ethers.utils.parseEther('500'));

		await presale.connect(admin).setRound('3');
		await presale.connect(buyer).getTokens(buyer.address, { value: ethers.utils.parseEther('0.001') });
		expect(ethers.utils.formatEther(await token.balanceOf(buyer.address))).to.equal('400.0');
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

	after(() => {
		console.log('Token address:', token.address);
		console.log('Presale contract address:', presale.address);
	});
});
