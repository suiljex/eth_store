from flask import Flask, jsonify, request, send_file, redirect, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
import os
import datetime
import psycopg2
import hashlib
import web3
import app_data
import random
import string

w3 = web3.Web3(web3.Web3.HTTPProvider(app_data.provider_url))
contract = w3.eth.contract(address=app_data.address, abi=app_data.abi)
app = Flask(__name__)
con = psycopg2.connect(
    database=app_data.db_name,
    user=app_data.db_user,
    password=app_data.db_password,
    host=app_data.db_url,
    port=app_data.db_port)


ALLOWED_EXTENSIONS = {'png'}
TEMP_FOLDER = os.path.dirname(os.path.abspath(__file__)) + '/temp/'
MIN_SIZE = 128, 128


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def randomString(stringLength):
    """Generate a random string with the combination of lowercase and uppercase letters """

    letters = string.ascii_letters
    return ''.join(random.choice(letters) for i in range(stringLength))


@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)


@app.route('/')
def redirect_index():
    return redirect('/index.html')


@app.route('/object/<int:obj_index>/full/', methods=['GET'])
def get_object_full(obj_index):
    resp = dict()
    obj_index = int(obj_index)
    flag_allow_download = False
    if request.method == 'GET':
        private_key = randomString(32)
        public_key = randomString(32)
        try:
            cur = con.cursor()
            cur.execute("""
                            INSERT INTO download_requests (private_key, public_key, index) 
                            VALUES (%(private_key)s, %(public_key)s, %(obj_index)s) 
                            ON CONFLICT (index) 
                            DO UPDATE SET private_key = %(private_key)s, public_key = %(public_key)s
                        """
                        , {'private_key': private_key
                            , 'public_key': public_key
                            , 'obj_index': obj_index})
        except psycopg2.Error as e:
            con.rollback()
            resp['status'] = 'error'
            resp['message'] = 'Request not created'
            return jsonify(resp)
        con.commit()

        resp['status'] = 'success'
        resp['message'] = 'Request created'
        resp['public_key'] = public_key
        resp['private_key'] = private_key
        return jsonify(resp)
    resp['status'] = 'error'
    resp['message'] = 'Something went wrong uwu'
    return jsonify(resp)


@app.route('/object/<int:obj_index>/full/<string:private_key>/', methods=['GET'])
def get_object_full_image(obj_index, private_key):
    resp = dict()
    obj_index = int(obj_index)
    private_key = str(private_key)
    flag_allow_download = False
    if request.method == 'GET':
        try:
            cur = con.cursor()
            cur.execute("""
                            SELECT private_key, public_key 
                            FROM download_requests 
                            WHERE index = %(obj_index)s
                        """
                        , {'obj_index': obj_index})
            row = cur.fetchone()
            public_key = contract.functions.requestKey(obj_index).call()
            if private_key == row[0] and public_key == row[1]:
                cur.execute("""
                                DELETE FROM download_requests 
                                WHERE index = %(obj_index)s
                            """
                            , {'obj_index': obj_index})
                flag_allow_download = True
                con.commit()
        except:
            # print(e)
            con.rollback()
            resp['status'] = 'error'
            resp['message'] = 'Not able to verify keys'
            return jsonify(resp)

        if flag_allow_download == True:
            try:
                temp_obj = contract.functions.objects(obj_index).call()
                obj_hash = temp_obj[0]

                cur = con.cursor()
                cur.execute("""
                                SELECT picture, extention 
                                FROM objects 
                                WHERE hash = %(obj_hash)s
                            """
                            , {'obj_hash': obj_hash})
                blob = cur.fetchone()
                filename_full = os.path.join(TEMP_FOLDER
                                             , datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S_') + obj_hash + "." + blob[1])
                with open(filename_full, "wb") as f:
                    f.write(blob[0])
                    f.close()
                    resp = send_file(filename_full, as_attachment=True, mimetype='image/png')
                    os.remove(filename_full)
                    # resp['hash'] = str(obj_hash)
                    # resp['status'] = 'success'
                    # resp['message'] = 'Full image'
                    # resp['data'] = blob[0]
                    return resp
            except:
                # print(e)
                con.rollback()
                resp['status'] = 'error'
                resp['message'] = 'No object'
                return jsonify(resp)
    resp['status'] = 'error'
    resp['message'] = 'Something went wrong uwu'
    return jsonify(resp)


@app.route('/object/add/', methods=['POST'])
def add_object():
    resp = dict()

    if request.method == 'POST':
        # obj_hash = request.headers['hash']
        if 'image' not in request.files:
            resp['status'] = 'error'
            resp['message'] = 'No file attached in request'
            return jsonify(resp)
        if 'account' not in request.headers or w3.isChecksumAddress(w3.toChecksumAddress(request.headers['account'])) is False:
            resp['status'] = 'error'
            resp['message'] = 'No account request'
            return jsonify(resp)
        file = request.files['image']
        if file.filename == '':
            resp['status'] = 'error'
            resp['message'] = 'No file selected'
            return jsonify(resp)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filename_full = os.path.join(TEMP_FOLDER
                                         , datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S_') + filename)
            file.save(filename_full)
            with open(filename_full, "rb") as f:
                file_data = f.read()
                f.close()
                os.remove(filename_full)
                readable_hash = hashlib.sha256(file_data).hexdigest()
                resp['hash'] = str(readable_hash)
                try:
                    cur = con.cursor()
                    cur.execute("""
                                    INSERT INTO objects (hash, extention, picture) 
                                    VALUES (%(var_hash)s, %(var_ext)s, %(var_data)s)
                                """
                                , {'var_hash': resp['hash']
                                    , 'var_ext': 'png'
                                    , 'var_data': psycopg2.Binary(file_data)})
                except psycopg2.Error as e:
                    con.rollback()
                    resp['status'] = 'error'
                    resp['message'] = 'File already exists'
                    return jsonify(resp)
            con.commit()

            nonce = w3.eth.getTransactionCount(app_data.account)
            transaction = contract.functions.AddPermission(str(readable_hash), w3.toChecksumAddress(request.headers['account'])) \
                .buildTransaction({
                'from': app_data.account
                , 'gasPrice': w3.toWei('1', 'gwei')
                , 'gas': 3000000
                , 'nonce': nonce
            })
            signed_txn = w3.eth.account.signTransaction(transaction, private_key=app_data.private_key)
            w3.eth.sendRawTransaction(signed_txn.rawTransaction)

            resp['status'] = 'success'
            resp['message'] = 'File uploaded'
            return jsonify(resp)
    resp['status'] = 'error'
    resp['message'] = 'Something went wrong uwu'
    return jsonify(resp)


@app.route('/object/<string:obj_hash>/min/', methods=['GET'])
def get_object_min(obj_hash):
    resp = dict()
    obj_hash = str(obj_hash)
    if request.method == 'GET':
        try:
            cur = con.cursor()
            cur.execute("""
                            SELECT picture, extention 
                            FROM objects
                            WHERE hash = %(obj_hash)s
                        """
                        , {'obj_hash': obj_hash})
            blob = cur.fetchone()
            filename_full = os.path.join(TEMP_FOLDER
                                         , datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S_') + obj_hash + "." + blob[1])
            with open(filename_full, "wb") as f:
                f.write(blob[0])
                f.close()
                image = Image.open(filename_full)
                image.thumbnail(MIN_SIZE)
                image.save(filename_full)
                resp = send_file(filename_full, as_attachment=True, mimetype='image/png')
                os.remove(filename_full)
                # resp['hash'] = str(obj_hash)
                # resp['status'] = 'success'
                # resp['message'] = 'Full image'
                # resp['data'] = blob[0]
                return resp
        except:
            # print(e)
            resp['status'] = 'error'
            resp['message'] = 'No object'
            return jsonify(resp)
    resp['status'] = 'error'
    resp['message'] = 'Something went wrong uwu'
    return jsonify(resp);


if w3.isConnected() is False:
    print("No connection to BC")
    exit(1)


nonce = w3.eth.getTransactionCount(app_data.account)
transaction = contract.functions.SetServerAccount(app_data.account)\
    .buildTransaction({
        'from': app_data.account
        , 'gasPrice': w3.toWei('1', 'gwei')
        , 'gas': 3000000
        , 'nonce': nonce
        })
signed_txn = w3.eth.account.signTransaction(transaction, private_key=app_data.private_key)
w3.eth.sendRawTransaction(signed_txn.rawTransaction)


if __name__ == '__main__':
    app.run(host='0.0.0.0')

