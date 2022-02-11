require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-etherscan');

const { bscApi } = require('./secret.json');

module.exports = {
	defaultNetwork: 'ganache',
	networks: {
		ganache: {
			url: 'http://127.0.0.1:7545',
		},
		bsc: {
			url: 'https://bsc-dataseed.binance.org/',
			chainId: 56,
		},
		testnet: {
			url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
			chainId: 97,
		},
	},
	solidity: {
		version: '0.8.9',
	},
	etherscan: {
		apiKey: bscApi,
	},
};
