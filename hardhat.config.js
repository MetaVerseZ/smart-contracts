require('dotenv').config();
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');

module.exports = {
	defaultNetwork: 'ganache',
	networks: {
		ganache: {
			url: 'http://127.0.0.1:7545',
			// accounts: [process.env.PRIVATE_KEY_1, process.env.PRIVATE_KEY_2],
		},
	},
	solidity: {
		version: '0.8.9',
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
};
