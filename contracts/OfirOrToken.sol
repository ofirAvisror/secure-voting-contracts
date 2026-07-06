// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OfirOrToken is ERC20, Ownable {
    address public minter;

    event MinterUpdated(
        address indexed previousMinter,
        address indexed newMinter
    );

    constructor(
        address initialOwner
    ) ERC20("OfirOr Token", "OFO") Ownable(initialOwner) {}

    function setMinter(address newMinter) external onlyOwner {
        require(newMinter != address(0), "OfirOr: zero minter");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "OfirOr: not minter");
        _mint(to, amount);
    }
}
