import os
import json
import time
from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

load_dotenv()

# ABI matching PatientRecord.sol
CONTRACT_ABI = json.loads('''[
    {"inputs": [{"internalType": "string","name": "recordId","type": "string"},{"internalType": "string","name": "recordHash","type": "string"}],"name": "storeRecordHash","outputs": [],"stateMutability": "nonpayable","type": "function"},
    {"inputs": [{"internalType": "string","name": "recordId","type": "string"}],"name": "getRecordHash","outputs": [{"internalType": "string","name": "","type": "string"}],"stateMutability": "view","type": "function"}
]''')

class BlockchainService:
    def __init__(self):
        self.w3 = None
        self.account = None
        self.contract = None
        self.rpc_url = None
        self.private_key = None
        self.contract_address = None
        self._init_connection()

    def _init_connection(self):
        load_dotenv()
        self.rpc_url = os.getenv("SEPOLIA_RPC_URL")
        self.private_key = os.getenv("PRIVATE_KEY")
        self.contract_address = os.getenv("CONTRACT_ADDRESS")

        if not self.rpc_url or not self.private_key or not self.contract_address:
            print("WARNING: Blockchain credentials not fully configured in environment.")
            return

        try:
            # 30-second timeout for resilient mobile hotspot / remote RPC
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={'timeout': 30}))
            self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
            self.account = self.w3.eth.account.from_key(self.private_key)
            self.contract = self.w3.eth.contract(address=self.contract_address, abi=CONTRACT_ABI)
        except Exception as e:
            print(f"WARNING: Error initializing Web3 connection: {e}")

    def ensure_connected(self):
        """
        Guarantees that the Web3 provider, account, and contract are initialized and reachable.
        Attempts auto-reconnection if the connection was temporarily lost.
        """
        if not self.w3 or not self.account or not self.contract:
            self._init_connection()

        if not self.w3 or not self.account or not self.contract:
            raise Exception("Blockchain not configured (Check SEPOLIA_RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS in .env)")

        # Quick connectivity verification with auto-reconnect
        for attempt in range(2):
            try:
                if self.w3.is_connected():
                    return
            except Exception:
                pass
            time.sleep(1)
            self._init_connection()

        if not self.w3 or not self.w3.is_connected():
            raise Exception("Blockchain not connected. Please verify internet connection and SEPOLIA_RPC_URL.")

    def store_record_hash(self, record_id: str, record_hash: str) -> str:
        """
        Stores the SHA-256 hash of a medical record on the Sepolia blockchain.
        Returns the transaction hash.
        Includes automatic retry for mobile hotspot / network latency.
        """
        self.ensure_connected()

        last_err = None
        for attempt in range(3):
            try:
                nonce = self.w3.eth.get_transaction_count(self.account.address, 'pending')
                
                # Build transaction
                tx = self.contract.functions.storeRecordHash(
                    record_id, 
                    record_hash
                ).build_transaction({
                    'from': self.account.address,
                    'nonce': nonce,
                })

                # Sign transaction
                signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
                
                # Send raw signed transaction
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                return self.w3.to_hex(tx_hash)
            except Exception as e:
                last_err = e
                print(f"[Blockchain] Transaction attempt {attempt + 1} failed: {e}. Retrying...")
                time.sleep(1.5)
                self._init_connection()

        raise Exception(f"Blockchain verification failed: {str(last_err)}")

    def get_record_hash(self, record_id: str) -> str:
        """
        Retrieves the SHA-256 hash of a record from the smart contract on Ethereum Sepolia.
        """
        self.ensure_connected()
        return self.contract.functions.getRecordHash(record_id).call()

blockchain_service = BlockchainService()
