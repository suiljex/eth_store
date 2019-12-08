let vm = new Vue({
  el: '#app',
  data: {
    objects: [],
    all_objects: [],
    store_objects: [],
    own_objects: [],
  },
  methods: {
    Dummy: function () {

    },
    getImgMinUrl: function (obj) {
      return "/object/" + obj + "/min/";
    },
    getImgFull: function (index) {
      //console.log("kek");
      //window.open("/object/" + obj + "/full/");
      App.downloadObject(index);
      return;
    },
    buyObject: function (index) {
      App.buyObject(index);
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
  }
});

App = {
  loading: false,

  load: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.loadObjects();
    await App.loadOwnObjects();
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
  },

  loadContract: async () => {
    console.log("loadContract");
    // Create a JavaScript version of the smart contract

    App.contract = web3.eth.contract(eth_store_abi).at(eth_store_address);

    App.contract.GetObjectsCount.call((error, result) => {
      if (!error) {
        console.log(result.c[0]);
      }
    });

    let price_temp = 2; //await App.contract.sale_price();
    await App.contract.sale_price.call((error, result) => {
      if (!error) {
        price_temp = result.c[0];
        console.log(price_temp);
      }
    });
  },

  addObject: async (hash) => {
    console.log("addObject");

    await App.contract.sale_price.call((error, result) => {
      if (!error) {
        let price_temp = result.c[0];
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
        console.log(temp_objects);
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
        let price_temp = result.c[0];

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
      let private_key= json_data.private_key;
      console.log(public_key);
      console.log(private_key);

      App.contract.AddRequestKey.sendTransaction(index, public_key, {from: App.account}, (error, result) => {
        if (!error) {
          // let xmlHttp = new XMLHttpRequest();
          // xmlHttp.open('GET', '/object/' + index + '/full/', false);
          // xmlHttp.setRequestHeader('private_key', private_key);
          // xmlHttp.send();
          //
          // if (xmlHttp.status != 200) {
          //   console.log('Error 2nd download request');
          //   return;
          // }
          window.open('/object/' + index + '/full/' + private_key + '/');
          //json_data = JSON.parse(xmlHttp.responseText);
          // console.log(xmlHttp);
        }
      });
    }
  },
};


function LoadObjects() {
  var xmlHttp = new XMLHttpRequest();
  // xmlHttp.responseType = 'json';
  xmlHttp.open('GET', '/store/all/', false);
  xmlHttp.send();
  if (xmlHttp.status != 200) {
    return;
  }

  let json_data = JSON.parse(xmlHttp.responseText);
  if (json_data['status'] != 'success') {
    return;
  }

  for (temp_obj in json_data['data']) {
    vm.store_objects.push({hash: json_data['data'][temp_obj]['hash']})
  }
}

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
    alert('Error');
  }
};

//LoadObjects();
App.load();
