// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IGM {
    function getStreak(address user) external view returns (uint256);
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

contract GMBadgeNFT {
    string public constant name = "Vibeswap GM Badge";
    string public constant symbol = "VGM";

    address public immutable treasury;
    uint256 public immutable mintFee;
    IGM public immutable gm;

    uint256 public totalSupply;
    uint256[4] private _tierSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(uint256 => bool)) private _mintedTier;
    mapping(uint256 => uint256) private _tokenTier;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Mint(address indexed user, uint256 tier, uint256 tokenId);

    constructor(address gm_, address treasury_, uint256 mintFee_) {
        require(gm_ != address(0), "GM is zero");
        require(treasury_ != address(0), "Treasury is zero");
        require(mintFee_ > 0, "Mint fee is zero");

        gm = IGM(gm_);
        treasury = treasury_;
        mintFee = mintFee_;
    }

    function mint(uint256 tier) external payable {
        require(tier >= 1 && tier <= 3, "Invalid tier");
        require(msg.value == mintFee, "Invalid mint fee");
        require(gm.getStreak(msg.sender) >= _streakRequired(tier), "Streak not reached");
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
            '{"name":"Vibeswap GM Badge #',
            _toString(tokenId),
            '","description":"',
            _tierName(tier),
            '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_svg(tier))),
            '","attributes":[{"trait_type":"Tier","value":',
            _toString(tier),
            '},{"trait_type":"Streak","value":"',
            _toString(_streakRequired(tier)),
            ' days"}]}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _streakRequired(uint256 tier) private pure returns (uint256) {
        if (tier == 1) return 3;
        if (tier == 2) return 10;
        return 30;
    }

    function _tierName(uint256 tier) private pure returns (string memory) {
        if (tier == 1) return "3-Day Sun";
        if (tier == 2) return "10-Day Radiance";
        return "30-Day Orbiter";
    }

    function _tierColor(uint256 tier) private pure returns (string memory) {
        if (tier == 1) return "#fbbf24";
        if (tier == 2) return "#f59e0b";
        return "#d97706";
    }

    function _svg(uint256 tier) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">',
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0%" stop-color="',
            _tierColor(tier),
            '"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs>',
            '<rect width="512" height="512" rx="64" fill="url(#g)"/>',
            '<text x="256" y="236" font-size="40" fill="#ffffff" text-anchor="middle" font-family="sans-serif">Vibeswap GM</text>',
            '<text x="256" y="300" font-size="56" fill="#ffffff" text-anchor="middle" font-family="sans-serif">',
            _tierName(tier),
            '</text>',
            '<text x="256" y="360" font-size="28" fill="#ffffff" text-anchor="middle" font-family="sans-serif">',
            _toString(_streakRequired(tier)),
            ' day streak</text></svg>'
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
