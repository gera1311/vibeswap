// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IVibeGame {
    function activeRun(address user) external view returns (bool);
    function maxBlock(address user) external view returns (uint256);
}

library Base64 {
    bytes internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";

        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);

        uint256 i = 0;
        uint256 j = 0;

        while (i + 3 <= len) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = uint256(uint8(data[i + 1]));
            uint256 c = uint256(uint8(data[i + 2]));

            result[j] = TABLE[a >> 2];
            result[j + 1] = TABLE[((a & 3) << 4) | (b >> 4)];
            result[j + 2] = TABLE[((b & 15) << 2) | (c >> 6)];
            result[j + 3] = TABLE[c & 63];

            i += 3;
            j += 4;
        }

        uint256 remaining = len - i;
        if (remaining == 1) {
            uint256 a = uint256(uint8(data[i]));
            result[j] = TABLE[a >> 2];
            result[j + 1] = TABLE[(a & 3) << 4];
            result[j + 2] = "=";
            result[j + 3] = "=";
        } else if (remaining == 2) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = uint256(uint8(data[i + 1]));
            result[j] = TABLE[a >> 2];
            result[j + 1] = TABLE[((a & 3) << 4) | (b >> 4)];
            result[j + 2] = TABLE[(b & 15) << 2];
            result[j + 3] = "=";
        }

        return string(result);
    }
}

contract VibeBlockNFT {
    string public constant name = "Vibeswap Block Achievements";
    string public constant symbol = "VBLK";

    address public immutable treasury;
    uint256 public immutable mintFee;
    IVibeGame public immutable game;

    uint256 public totalSupply;
    uint256[5] private _tierSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(uint256 => bool)) private _mintedTier;
    mapping(uint256 => uint256) private _tokenTier;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Mint(address indexed user, uint256 tier, uint256 tokenId);

    constructor(address game_, address treasury_, uint256 mintFee_) {
        require(game_ != address(0), "Game is zero");
        require(treasury_ != address(0), "Treasury is zero");
        require(mintFee_ > 0, "Mint fee is zero");

        game = IVibeGame(game_);
        treasury = treasury_;
        mintFee = mintFee_;
    }

    function mint(uint256 tier) external payable {
        require(tier >= 1 && tier <= 4, "Invalid tier");
        require(msg.value == mintFee, "Invalid mint fee");
        require(game.activeRun(msg.sender), "No active run");
        require(game.maxBlock(msg.sender) >= _blockRequired(tier), "Block not reached");
        require(!_mintedTier[msg.sender][tier], "Already minted");

        _mintedTier[msg.sender][tier] = true;

        totalSupply += 1;
        _tierSupply[tier] += 1;

        uint256 tokenId = totalSupply;
        _owners[tokenId] = msg.sender;
        _tokenTier[tokenId] = tier;
        _balances[msg.sender] += 1;

        (bool sent, ) = treasury.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        emit Transfer(address(0), msg.sender, tokenId);
        emit Mint(msg.sender, tier, tokenId);
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Nonexistent token");
        return owner;
    }

    function hasMinted(address user, uint256 tier) external view returns (bool) {
        return _mintedTier[user][tier];
    }

    function holdersCount(uint256 tier) external view returns (uint256) {
        return _tierSupply[tier];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");

        uint256 tier = _tokenTier[tokenId];

        string memory json = string.concat(
            '{"name":"Vibeswap Block Achievement #',
            _toString(tokenId),
            '","description":"',
            _tierName(tier),
            '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_svg(tier))),
            '","attributes":[{"trait_type":"Tier","value":',
            _toString(tier),
            '},{"trait_type":"Block","value":',
            _toString(_blockRequired(tier)),
            '}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _blockRequired(uint256 tier) private pure returns (uint256) {
        if (tier == 1) return 512;
        if (tier == 2) return 1024;
        if (tier == 3) return 2048;
        return 4096;
    }

    function _tierName(uint256 tier) private pure returns (string memory) {
        if (tier == 1) return "512 Block";
        if (tier == 2) return "1024 Block";
        if (tier == 3) return "2048 Block";
        return "4096 Legendary Block";
    }

    function _tierColor(uint256 tier) private pure returns (string memory) {
        if (tier == 1) return "#c084fc";
        if (tier == 2) return "#818cf8";
        if (tier == 3) return "#fbbf24";
        return "#f43f5e";
    }

    function _svg(uint256 tier) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">',
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0%" stop-color="',
            _tierColor(tier),
            '"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs>',
            '<rect width="512" height="512" rx="64" fill="url(#g)"/>',
            '<text x="256" y="230" font-size="40" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Vibe Blocks</text>',
            '<text x="256" y="300" font-size="56" fill="#ffffff" text-anchor="middle" font-family="sans-serif">',
            _tierName(tier),
            '</text>',
            '<text x="256" y="360" font-size="28" fill="#ffffff" text-anchor="middle" font-family="sans-serif">',
            _toString(_blockRequired(tier)),
            ' tile</text></svg>'
        );
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";

        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits += 1;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }

        return string(buffer);
    }
}
