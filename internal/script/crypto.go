package script

import (
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/md5"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
)

func MD5Hash(input string) string {
	hash := md5.Sum([]byte(input))
	return hex.EncodeToString(hash[:])
}

func SHA1Hash(input string) string {
	h := sha1.Sum([]byte(input))
	return hex.EncodeToString(h[:])
}

func SHA256Hash(input string) string {
	h := sha256.Sum256([]byte(input))
	return hex.EncodeToString(h[:])
}

func SHA512Hash(input string) string {
	h := sha512.Sum512([]byte(input))
	return hex.EncodeToString(h[:])
}

func Base64Encode(input string) string {
	return base64.StdEncoding.EncodeToString([]byte(input))
}

func Base64Decode(input string) string {
	decoded, err := base64.StdEncoding.DecodeString(input)
	if err != nil {
		return ""
	}
	return string(decoded)
}

func Base64URLEncode(input string) string {
	return base64.URLEncoding.EncodeToString([]byte(input))
}

func Base64URLDecode(input string) string {
	decoded, err := base64.URLEncoding.DecodeString(input)
	if err != nil {
		return ""
	}
	return string(decoded)
}

func HMACSHA256(message, key string) string {
	h := hmac.New(sha256.New, []byte(key))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))
}

func HMACSHA1(message, key string) string {
	h := hmac.New(sha1.New, []byte(key))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))
}

func AESEncrypt(plaintext, key string) string {
	keyBytes := []byte(key)
	if len(keyBytes) != 16 && len(keyBytes) != 24 && len(keyBytes) != 32 {
		return ""
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return ""
	}

	plaintextBytes := []byte(plaintext)
	ciphertext := make([]byte, aes.BlockSize+len(plaintextBytes))
	iv := ciphertext[:aes.BlockSize]
	rand.Read(iv)

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintextBytes)

	return base64.StdEncoding.EncodeToString(ciphertext)
}

func AESDecrypt(ciphertextBase64, key string) string {
	keyBytes := []byte(key)
	if len(keyBytes) != 16 && len(keyBytes) != 24 && len(keyBytes) != 32 {
		return ""
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return ""
	}

	if len(ciphertext) < aes.BlockSize {
		return ""
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return ""
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return string(ciphertext)
}

func AESEncryptWithIV(plaintext, key, ivHex string) string {
	keyBytes := []byte(key)
	if len(keyBytes) != 16 && len(keyBytes) != 24 && len(keyBytes) != 32 {
		return ""
	}

	iv, err := hex.DecodeString(ivHex)
	if err != nil || len(iv) != aes.BlockSize {
		iv = []byte(ivHex)
		if len(iv) != aes.BlockSize {
			return ""
		}
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return ""
	}

	plaintextBytes := []byte(plaintext)
	ciphertext := make([]byte, len(plaintextBytes))
	stream := cipher.NewCBCEncrypter(block, iv)
	stream.CryptBlocks(ciphertext, plaintextBytes)

	return base64.StdEncoding.EncodeToString(ciphertext)
}

func AESDecryptWithIV(ciphertextBase64, key, ivHex string) string {
	keyBytes := []byte(key)
	if len(keyBytes) != 16 && len(keyBytes) != 24 && len(keyBytes) != 32 {
		return ""
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return ""
	}

	iv, err := hex.DecodeString(ivHex)
	if err != nil || len(iv) != aes.BlockSize {
		iv = []byte(ivHex)
		if len(iv) != aes.BlockSize {
			return ""
		}
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return ""
	}

	if len(ciphertext) < aes.BlockSize {
		return ""
	}

	plaintext := make([]byte, len(ciphertext))
	stream := cipher.NewCBCDecrypter(block, iv)
	stream.CryptBlocks(plaintext, ciphertext)

	plaintext = unpad(plaintext)
	return string(plaintext)
}

func unpad(src []byte) []byte {
	length := len(src)
	padding := int(src[length-1])
	if padding > length {
		return src
	}
	return src[:length-padding]
}

func RandomString(length int) string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	rand.Read(result)
	for i, b := range result {
		result[i] = chars[int(b)%len(chars)]
	}
	return string(result)
}

func FormatJSON(input string) string {
	var obj interface{}
	if err := json.Unmarshal([]byte(input), &obj); err != nil {
		return input
	}
	result, _ := json.MarshalIndent(obj, "", "  ")
	return string(result)
}

func RSAPublicEncrypt(plaintext, publicKeyPEM string) string {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return ""
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		pubInterface, err := x509.ParsePKCS1PublicKey(block.Bytes)
		if err != nil {
			return ""
		}
		pub = pubInterface
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return ""
	}

	ciphertext, err := rsa.EncryptPKCS1v15(rand.Reader, rsaPub, []byte(plaintext))
	if err != nil {
		return ""
	}

	return base64.StdEncoding.EncodeToString(ciphertext)
}

func RSAPrivateDecrypt(ciphertextBase64, privateKeyPEM string) string {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return ""
	}

	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return ""
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return ""
	}

	plaintext, err := rsa.DecryptPKCS1v15(rand.Reader, priv, ciphertext)
	if err != nil {
		return ""
	}

	return string(plaintext)
}

func RSASign(message, privateKeyPEM string) string {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return ""
	}

	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return ""
	}

	h := sha256.New()
	h.Write([]byte(message))
	hashed := h.Sum(nil)

	signature, err := rsa.SignPKCS1v15(rand.Reader, priv, crypto.SHA256, hashed)
	if err != nil {
		return ""
	}

	return base64.StdEncoding.EncodeToString(signature)
}

func RSAVerify(message, signatureBase64, publicKeyPEM string) bool {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return false
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		pubInterface, err := x509.ParsePKCS1PublicKey(block.Bytes)
		if err != nil {
			return false
		}
		pub = pubInterface
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return false
	}

	h := sha256.New()
	h.Write([]byte(message))
	hashed := h.Sum(nil)

	signature, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return false
	}

	return rsa.VerifyPKCS1v15(rsaPub, crypto.SHA256, hashed, signature) == nil
}

func RSAEncryptOAEP(plaintext, publicKeyPEM, label string) string {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return ""
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		pubInterface, err := x509.ParsePKCS1PublicKey(block.Bytes)
		if err != nil {
			return ""
		}
		pub = pubInterface
	}

	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return ""
	}

	ciphertext, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, rsaPub, []byte(plaintext), []byte(label))
	if err != nil {
		return ""
	}

	return base64.StdEncoding.EncodeToString(ciphertext)
}

func RSADecryptOAEP(ciphertextBase64, privateKeyPEM, label string) string {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return ""
	}

	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return ""
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return ""
	}

	plaintext, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, priv, ciphertext, []byte(label))
	if err != nil {
		return ""
	}

	return string(plaintext)
}

func GenerateRSAKeyPair(bits int) map[string]string {
	privateKey, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		return nil
	}

	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(privateKey),
	})

	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return nil
	}
	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})

	return map[string]string{
		"privateKey": string(privateKeyPEM),
		"publicKey":  string(publicKeyPEM),
	}
}
