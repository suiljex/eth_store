pragma solidity >=0.4.22 <0.6.0;

import "./Ownable.sol";
import "./DSMath.sol";

contract PngStore is Ownable, DSMath
{
  event ObjectCreated(uint256 id, address owner);
  event CreationPermitted(string hash, address owner);
  event ObjectBought(uint256 id, address seller, address buyer);
  //event ObjectPermitionGranted(uint256 id, address grantor, address recipient, uint32 time_beg, uint32 time_end);

  struct Object
  {
    string hash;
    address owner;
  }

  Object[] public objects;
  mapping(address => string) public permitted_objects;
  
  address public server_account;

  uint256 public sell_fee = 0;
  uint256 public owner_share = 0;
  uint256 public sale_price = 0;

  uint256 balance = 0;

  mapping (address => uint256) public balanceOfSubject;

  mapping (uint256 => bool) public statusOfObject;
  mapping (uint256 => bool) public statusSaleOfObject;
  mapping (uint256 => address) public effectiveOwnerOfObject;
  mapping (uint256 => uint256) public priceOfObject;
  mapping (uint256 => uint32) public creationTimeOfObject;
  mapping (uint256 => uint256) public parentOfObject;
  mapping (uint256 => uint256[]) public childrenOfObject;
  mapping (uint256 => address[]) public approvalsOfObject;
  mapping (uint256 => string) public requestKey;

  modifier IsObjectExists(uint256 _obj_id)
  {
    require(objects.length > _obj_id);
    _;
  }

  modifier IsEffectiveOwnerOf(uint256 _obj_id)
  {
    require(effectiveOwnerOfObject[_obj_id] == msg.sender);
    _;
  }
  
  modifier IsServer()
  {
    require(msg.sender == server_account);
    _;
  }

  modifier IsObjectEnabled(uint256 _obj_id)
  {
    require(statusOfObject[_obj_id] == true);
    _;
  }

  modifier IsObjectSalePaid(uint256 _obj_id)
  {
    require(statusSaleOfObject[_obj_id] == true);
    _;
  }
  
  modifier IsCreationPermitted(string memory _hash)
  {
    require(keccak256(abi.encodePacked(permitted_objects[msg.sender])) == keccak256(abi.encodePacked(_hash)));
    _;
  }
  
  function SetServerAccount(address _account) external onlyOwner()
  {
    server_account = _account;
  }
  
  function AddPermission(string calldata _hash, address _account) external IsServer()
  {
    permitted_objects[_account] = _hash;
    emit CreationPermitted(_hash, _account);
  }
  
  function AddRequestKey(uint256 _obj_id, string calldata _pub_key) external IsObjectExists(_obj_id) IsEffectiveOwnerOf(_obj_id)
  {
    requestKey[_obj_id] = _pub_key;
  }
  
  function SetSellFee(uint256 _fee) external onlyOwner()
  {
    require(_fee >= 0 && _fee <= 1);
    sell_fee = _fee;
  }

  function SetOwnerShare(uint256 _share) external onlyOwner()
  {
    require(_share >= 0 && _share <= 1);
    owner_share = _share;
  }

  function SetSalePrice(uint256 _price) external onlyOwner()
  {
    sale_price = _price;
  }

  function OwnerWithdraw(uint256 _amount) external onlyOwner()
  {
    require(_amount <= balance);
    balance -= _amount;
    msg.sender.transfer(_amount);
  }

  function CreateObject(string calldata _hash) external payable IsCreationPermitted(_hash)
  {
    require(msg.value == sale_price);
    balance += sale_price;

    uint32 time_now = uint32(now);
    uint256 id = objects.push(Object(_hash, msg.sender)) - 1;
    permitted_objects[msg.sender] = "";
    statusOfObject[id] = false;
    statusSaleOfObject[id] = true;
    effectiveOwnerOfObject[id] = msg.sender;
    priceOfObject[id] = 0;
    creationTimeOfObject[id] = time_now;

    emit ObjectCreated(id, msg.sender);
  }

  function StartSaleObject(uint256 _obj_id) external payable IsObjectExists(_obj_id) IsEffectiveOwnerOf(_obj_id)
  {
    require(statusSaleOfObject[_obj_id] == false);
    require(msg.value == sale_price);

    statusSaleOfObject[_obj_id] = true;
  }

  function EditObject(uint256 _obj_id
  , uint256 _price) external IsObjectExists(_obj_id) IsEffectiveOwnerOf(_obj_id)
  {
    priceOfObject[_obj_id] = _price;
  }

  function EnableObject(uint256 _obj_id) external IsObjectExists(_obj_id) IsEffectiveOwnerOf(_obj_id)
  {
    statusOfObject[_obj_id] = true;
  }

  function DisableObject(uint256 _obj_id) external IsObjectExists(_obj_id) IsEffectiveOwnerOf(_obj_id)
  {
    statusOfObject[_obj_id] = false;
  }

  function BuyObject(uint256 _obj_id) external payable IsObjectExists(_obj_id) IsObjectEnabled(_obj_id) IsObjectSalePaid(_obj_id)
  {
    uint32 time_now = uint32(now);
    require(msg.value == priceOfObject[_obj_id]);
    require(msg.sender != effectiveOwnerOfObject[_obj_id]);
    balanceOfSubject[effectiveOwnerOfObject[_obj_id]] += msg.value * (1 - sell_fee);
    balance += msg.value * sell_fee;

    uint256 id = objects.push(objects[_obj_id]) - 1;
    statusOfObject[id] = false;
    effectiveOwnerOfObject[id] = msg.sender;
    priceOfObject[id] = 0;
    creationTimeOfObject[id] = time_now;
    childrenOfObject[_obj_id].push(id);

    emit ObjectBought(id, effectiveOwnerOfObject[_obj_id], msg.sender);
  }

  function GiveObject(uint256 _obj_id, address _new_subj) external IsObjectExists(_obj_id) IsEffectiveOwnerOf(_obj_id)
  {
    approvalsOfObject[_obj_id].push(_new_subj);
  }

  function TakeObject(uint256 _obj_id) external IsObjectExists(_obj_id)
  {
    uint32 time_now = uint32(now);
    bool flag_approved = false;

    for (uint256 i = 0; i < approvalsOfObject[_obj_id].length; i++)
    {
      if (approvalsOfObject[_obj_id][i] == msg.sender)
      {
        flag_approved = true;
        delete approvalsOfObject[_obj_id][i];
        break;
      }
    }

    require(flag_approved == true);

    uint256 id = objects.push(objects[_obj_id]) - 1;
    statusOfObject[id] = false;
    statusSaleOfObject[id] = false;
    effectiveOwnerOfObject[id] = msg.sender;
    priceOfObject[id] = 0;
    creationTimeOfObject[id] = time_now;
    childrenOfObject[_obj_id].push(id);

    emit ObjectBought(id, effectiveOwnerOfObject[_obj_id], msg.sender);
  }

  function GetObjectsCount() public view returns(uint256)
  {
    return objects.length;
  }

  function GetSubjectObjects(address _subj) public view returns(uint256[] memory)
  {
    uint256 objs_count = 0;
    for (uint256 i = 0; i < objects.length; i++)
    {
      if (_subj == effectiveOwnerOfObject[i])
      {
        objs_count++;
      }
    }

    uint[] memory result = new uint256[](objs_count);
    uint256 counter = 0;
    for (uint256 i = 0; i < objects.length; i++)
    {
      if (_subj == effectiveOwnerOfObject[i])
      {
        result[counter] = i;
        counter++;
      }
    }

    return result;
  }

  function GetObjectParameters(uint256 _obj_id) public view IsObjectExists(_obj_id)
  returns(uint256 price, bool status, bool status_sale)
  {
    price = priceOfObject[_obj_id];
    status = statusOfObject[_obj_id];
    status_sale = statusSaleOfObject[_obj_id];
  }

  function GetObjectData(uint256 _obj_id) public view IsObjectExists(_obj_id)
  returns(string memory hash, address owner)
  {
    hash = objects[_obj_id].hash;
    owner = objects[_obj_id].owner;
  }

  //Пересмотреть
  function Withdraw(uint256 _amount) external
  {
    if (_amount == 0)
    {
      msg.sender.transfer(balanceOfSubject[msg.sender]);
      balanceOfSubject[msg.sender] = 0;
    }
    else if (balanceOfSubject[msg.sender] >= _amount)
    {
      msg.sender.transfer(_amount);
      balanceOfSubject[msg.sender] -= _amount;
    }
  }
}
