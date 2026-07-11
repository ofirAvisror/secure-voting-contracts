// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// erc20 token given to voters as a reward, only the election contract can mint these
contract OfirBalToken is ERC20, Ownable {
    address public minter;

    event MinterUpdated(
        address indexed previousMinter,
        address indexed newMinter
    );

    // sets the token name and symbol and records who the owner is
    constructor(
        address initialOwner
    ) ERC20("OfirBal Token", "BAL") Ownable(initialOwner) {}

    // owner calls this once after deploy to let the election contract mint tokens
    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "OfirBal: zero minter");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    // creates new tokens and sends them to an address, only the minter can do this
    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "OfirBal: not minter");
        _mint(to, amount);
    }
}
