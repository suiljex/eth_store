Vue.config.ignoredElements = ['grid', 'pic']
let vm = new Vue({
  el: '#app',
  data: {
    objects: [],
    all_objects: [],
    store_objects: [],
    own_objects: [],
    account: "",
    account_balance: -1,
    withdraw_amount: 0,
    current_object: {
      'hash': '',
      'owner': '',
      'price': '',
      'status': '',
      'status_sale': '',
      'effective_owner': '',
    },
    sale_price: -1,
    server_balance: -1,
    server_account: "",
    server_share: -1,
    owner_share: -1,
    new_sale_price: 0,
    new_server_share: 0,
    new_owner_share: 0,
  },
  methods: {
    Dummy: function () {

    },
    getImgMinUrl: function (obj) {
      return "/object/" + obj + "/min/";
    },
    getImgMidUrl: function (obj) {
      return "/object/" + obj + "/mid/";
    },
    getImgFull: function (index) {
      App.downloadObject(index);
      return;
    },
    buyObject: function (index) {
      App.buyObject(index);
      return;
    },
    withdrawEther: function () {
      App.withdrawEther(this.withdraw_amount);
      return;
    },
    withdrawEtherAdmin: function () {
      App.withdrawEtherAdmin(this.withdraw_amount);
      return;
    },
    setServerShare: function () {
      App.setServerShare(this.new_server_share);
      return;
    },
    setOwnerShare: function () {
      App.setOwnerShare(this.new_owner_share);
      return;
    },
    setSalePrice: function () {
      App.setSalePrice(this.new_sale_price);
      return;
    },
    payForSale: function (index) {
      App.payForSale(index);
      return;
    },
    changeStatus: function (index) {
      App.changeStatus(index);
      return;
    },
    changePrice: function (index, new_price) {
      App.changePrice(index, new_price);
      return;
    },
    openObject: function (index) {
      window.open("/object.html?index=" + index, "_self");
    },
  }
});

App = {
  loading: false,

  loadAll: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadContractParams();
    await App.loadAccountBalance();
    await App.loadObjects();
    await App.loadOwnObjects();
  },

  loadStore: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadContractParams();
    await App.loadObjects();
  },

  loadProfile: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadContractParams();
    await App.loadAccountBalance();
  },

  loadLibrary: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadContractParams();
    await App.loadOwnObjects();
  },

  loadObject: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadContractParams();
  },

  loadAdmin: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadContractParams();
  },

  // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
  loadWeb3: async () => {
    console.log("loadWeb3");
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider)
    } else {
      window.alert("Please connect to Metamask.")
    }
    // Modern dapp browsers...
    if (window.ethereum) {
      window.web3 = new Web3(ethereum);
      try {
        // Request account access if needed
        await ethereum.enable();
        // Acccounts now exposed
        web3.eth.sendTransaction({/* ... */})
      } catch (error) {
        // User denied account access...
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = web3.currentProvider;
      window.web3 = new Web3(web3.currentProvider);
      // Acccounts always exposed
      web3.eth.sendTransaction({/* ... */})
    }
    // Non-dapp browsers...
    else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  },

  loadAccount: async () => {
    console.log("loadAccount");
    // Set the current blockchain account
    App.account = web3.eth.accounts[0]
    vm.account = App.account;
  },

  loadContract: async () => {
    console.log("loadContract");

    App.contract = web3.eth.contract(eth_store_abi).at(eth_store_address);
  },

  loadContractParams: async () => {
    console.log("loadContractParams");

    await App.contract.sale_price.call((error, result) => {
      if (!error) {
        vm.sale_price = result;
      }
    });
    await App.contract.server_share.call((error, result) => {
      if (!error) {
        vm.server_share = result;
      }
    });
    await App.contract.owner_share.call((error, result) => {
      if (!error) {
        vm.owner_share = result;
      }
    });
    await App.contract.server_balance.call((error, result) => {
      if (!error) {
        vm.server_balance = result;
      }
    });
    await App.contract.server_account.call((error, result) => {
      if (!error) {
        vm.server_account = result;
      }
    });
  },

  loadAccountBalance: async () => {
    console.log("loadAccountBalance");

    await App.contract.balanceOfSubject.call(App.account, (error, result) => {
      if (!error) {
        vm.account_balance = result;
      }
    });
  },

  addObject: async (hash) => {
    console.log("addObject");

    await App.contract.sale_price.call((error, result) => {
      if (!error) {
        console.log(result);
        let price_temp = result;
        App.contract.CreateObject.sendTransaction(hash, {from: App.account, value: price_temp}, (error, result) => {
          if (!error) {
            console.log(result);
            window.location.reload();
          }
        });
      }
    });
  },

  loadObjects: async () => {
    console.log("loadObjects");
    vm.store_objects.clear;
    vm.all_objects.clear;
    await App.contract.GetObjectsCount.call((error, result) => {
      if (!error) {
        //console.log(result.c[0]);
        const obj_count = result.c[0];
        //console.log(obj_count);
        for (let i = 0; i < obj_count; ++i) {
          let temp_obj = {}
          App.contract.objects.call(i, (error, result) => {
            if (!error) {
              //console.log(result[0]);
              temp_obj.hash = result[0];
              temp_obj.owner = result[1];
              temp_obj.index = i;
              App.contract.GetObjectParameters.call(i, (error, result) => {
                if (!error) {
                  temp_obj.price = result[0];
                  temp_obj.status = result[1];
                  temp_obj.status_sale = result[2];
                  App.contract.effectiveOwnerOfObject.call(i, (error, result) => {
                    if (!error) {
                      temp_obj.effective_owner = result;

                      vm.all_objects.push(temp_obj);
                      if (temp_obj.status == true && temp_obj.status_sale == true) {
                        vm.store_objects.push(temp_obj);
                      }
                    }
                  });
                }
              });
            }
          });
        }
      }
    });
  },

  loadOwnObjects: async () => {
    console.log("loadOwnObjects");
    vm.own_objects.clear;
    await App.contract.GetSubjectObjects.call(App.account, (error, result) => {
      if (!error) {
        const temp_objects = result;
        //console.log(temp_objects);
        for (obj_index in temp_objects) {
          let temp_obj = {};
          //console.log(temp_objects[obj_index].c[0]);
          temp_obj.index = temp_objects[obj_index].c[0];
          App.contract.objects.call(temp_obj.index, (error, result) => {
            if (!error) {
              //console.log(result[0]);
              temp_obj.hash = result[0];
              temp_obj.owner = result[1];
              //temp_obj.index = temp_objects[obj_index].c[0];
              App.contract.GetObjectParameters.call(temp_obj.index, (error, result) => {
                if (!error) {
                  temp_obj.price = result[0];
                  temp_obj.status = result[1];
                  temp_obj.status_sale = result[2];
                  vm.own_objects.push(temp_obj);
                }
              });
            }
          });
        }
      }
    });
  },

  buyObject: async (index) => {
    console.log("buyObject");

    await App.contract.GetObjectParameters.call(index, (error, result) => {
      if (!error) {
        let price_temp = result[0];
        console.log(price_temp);
        App.contract.BuyObject.sendTransaction(index, {from: App.account, value: price_temp}, (error, result) => {
          if (!error) {
            console.log(result);
            window.location.reload();
          }
        });
      }
    });
  },

  withdrawEther: async (amount) => {
    console.log("withdrawEther");

    await App.contract.Withdraw.sendTransaction(amount, {from: App.account}, (error, result) => {
      if (!error) {
        console.log(result);
        window.location.reload();
      }
    });
  },

  withdrawEtherAdmin: async (amount) => {
    console.log("withdrawEtherAdmin");

    await App.contract.OwnerWithdraw.sendTransaction(amount, {from: App.account}, (error, result) => {
      if (!error) {
        console.log(result);
        window.location.reload();
      }
    });
  },

  setServerShare: async (share) => {
    console.log("setServerShare");

    await App.contract.SetServerShare.sendTransaction(share, {from: App.account}, (error, result) => {
      if (!error) {
        console.log(result);
        window.location.reload();
      }
    });
  },

  setOwnerShare: async (share) => {
    console.log("setOwnerShare");

    await App.contract.SetOwnerShare.sendTransaction(share, {from: App.account}, (error, result) => {
      if (!error) {
        console.log(result);
        window.location.reload();
      }
    });
  },

  setSalePrice: async (amount) => {
    console.log("setSalePrice");

    await App.contract.SetSalePrice.sendTransaction(amount, {from: App.account}, (error, result) => {
      if (!error) {
        console.log(result);
        window.location.reload();
      }
    });
  },

  changeStatus: async (index) => {
    console.log("changeStatus");

    let temp_obj = {};
    App.contract.GetObjectParameters.call(index, (error, result) => {
      if (!error) {
        temp_obj.price = result[0];
        temp_obj.status = result[1];
        temp_obj.status_sale = result[2];
        if (temp_obj.status == false) {
          App.contract.EnableObject.sendTransaction(index, {from: App.account}, (error, result) => {
            if (!error) {
              console.log(result);
              window.location.reload();
            }
          });
        } else {
          App.contract.DisableObject.sendTransaction(index, {from: App.account}, (error, result) => {
            if (!error) {
              console.log(result);
              window.location.reload();
            }
          });
        }
      }
    });
  },

  payForSale: async (index) => {
    console.log("changeStatus");

    await App.contract.sale_price.call((error, result) => {
      if (!error) {
        let price_temp = result;

        App.contract.StartSaleObject.sendTransaction(index, {from: App.account, value: price_temp}, (error, result) => {
          if (!error) {
            console.log(result);
            window.location.reload();
          }
        });
      }
    });
  },

  changePrice: async (index, new_price) => {
    console.log("changePrice");

    App.contract.EditObject.sendTransaction(index, new_price, {from: App.account}, (error, result) => {
      if (!error) {
        console.log(result);
        window.location.reload();
      }
    });
  },

  downloadObject: async (index) => {
    console.log("downloadObject");
    let xmlHttp = new XMLHttpRequest();
    //xmlHttp.responseType = 'blob';
    xmlHttp.open('GET', '/object/' + index + '/full/', false);
    xmlHttp.send();

    if (xmlHttp.status != 200) {
      return;
    }
    console.log(index);
    console.log(vm.own_objects);
    let json_data = JSON.parse(xmlHttp.responseText);

    if (json_data.status == 'success') {
      let public_key = json_data.public_key;
      let private_key = json_data.private_key;
      console.log(public_key);
      console.log(private_key);

      App.contract.AddRequestKey.sendTransaction(index, public_key, {from: App.account}, (error, result) => {
        if (!error) {
          window.open('/object/' + index + '/full/' + private_key + '/');
        }
      });
    } else {
      alert(json_data.message);
    }
  },
};

function getParameterByName(name, url) {
  if (!url) {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) {
    return null;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

async function startApp() {
  await App.loadAll();

  try {
    document.getElementById('fileUpload').onsubmit = async (e) => {
      e.preventDefault();
      let form_data = new FormData(document.getElementById('fileUpload'));
      console.log(App.account);

      let response = await fetch('/object/add/', {
        method: 'POST',
        headers: {
          'account': App.account
        },
        body: form_data
      });

      let result = await response.json();

      if (result.status == 'success') {
        await App.addObject(result.hash);
        //alert(result.hash);
      } else {
        alert(result.message);
      }
    };
  } catch (e) {
    console.log("No upload form");
  }

  try {
    vm.current_object.index = parseInt(getParameterByName('index'), 10);
    console.log(vm.current_object.index);

    await App.contract.objects.call(vm.current_object.index, (error, result) => {
      if (!error) {
        vm.current_object.hash = result[0];
        vm.current_object.owner = result[1];
        App.contract.GetObjectParameters.call(vm.current_object.index, (error, result) => {
          if (!error) {
            vm.current_object.price = result[0];
            vm.current_object.status = result[1];
            vm.current_object.status_sale = result[2];
            App.contract.effectiveOwnerOfObject.call(vm.current_object.index, (error, result) => {
              if (!error) {
                vm.current_object.effective_owner = result;
              }
            });
          }
        });
      }
    });
  } catch (e) {
    vm.current_object.hash = "";
    vm.current_object.owner = "";
    vm.current_object.price = "";
    vm.current_object.status = "";
    vm.current_object.status_sale = "";
    vm.current_object.effective_owner = "";
    console.log("No object in url");
  }

  console.log(vm.current_object);
}

startApp();

console.log(vm.current_object);