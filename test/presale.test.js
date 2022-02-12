const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Timelock tests', () => {
	describe('Presale', () => {
		before(async () => {
			[main, buyer] = await ethers.getSigners();
		});

		it('deploy token contract', async () => {
			const Token = await ethers.getContractFactory('Token');
			token = await Token.attach('0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6');
			// await token.deployed();
		});

		it('deploy presale', async () => {
			const Presale = await ethers.getContractFactory('Presale');
			presale = await Presale.attach('0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e');
			// await presale.deployed();
		});

		after(() => {
			console.log('\n\tToken address:', token.address);
			console.log('\tPresale address:', presale.address);
			console.log('\tMain address:', main.address);
		});
	});
});
