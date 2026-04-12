package crypto

import (
	"crypto/rand"
	"encoding/base64"
	"os"
	"sync"
)

// defaultKey 是首次使用的默认密钥，存储在环境变量 APIMAN_ENCRYPTION_KEY 中可覆盖
var defaultKey = [32]byte{
	0x61, 0x70, 0x69, 0x6d, 0x61, 0x6e, 0x2d, 0x67, // "apiman-g"
	0x69, 0x74, 0x2d, 0x73, 0x79, 0x6e, 0x63, 0x2d, // "it-sync-"
	0x6b, 0x65, 0x79, 0x2d, 0x32, 0x30, 0x32, 0x34, // "key-2024"
}

// encryptionKey 是实际使用的加密密钥
var encryptionKey [32]byte
var keyOnce sync.Once
var keyErr error

// GetEncryptionKey 返回当前会话使用的加密密钥
// 首次调用时尝试从环境变量 APIMAN_ENCRYPTION_KEY 加载，如果未设置则使用默认密钥
func GetEncryptionKey() ([32]byte, error) {
	keyOnce.Do(func() {
		keyErr = initKey()
	})
	return encryptionKey, keyErr
}

// initKey 初始化加密密钥
func initKey() error {
	// 优先从环境变量加载
	envKey := os.Getenv("APIMAN_ENCRYPTION_KEY")
	if envKey != "" {
		key, err := parseKey(envKey)
		if err != nil {
			return err
		}
		encryptionKey = key
		return nil
	}

	// 使用默认密钥
	encryptionKey = defaultKey
	return nil
}

// parseKey 从 base64 编码的字符串解析 32 字节密钥
func parseKey(keyStr string) ([32]byte, error) {
	data, err := base64.StdEncoding.DecodeString(keyStr)
	if err != nil {
		return defaultKey, err
	}
	if len(data) != 32 {
		return defaultKey, ErrInvalidKeyLength
	}
	var key [32]byte
	copy(key[:], data)
	return key, nil
}

// ErrInvalidKeyLength 当密钥长度不是 32 字节时返回此错误
var ErrInvalidKeyLength = &InvalidKeyLengthError{}

type InvalidKeyLengthError struct{}

func (e *InvalidKeyLengthError) Error() string {
	return "encryption key must be 32 bytes"
}

// GenerateRandomKey 生成一个新的随机 32 字节密钥（用于首次设置）
func GenerateRandomKey() (string, error) {
	var key [32]byte
	if _, err := rand.Read(key[:]); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(key[:]), nil
}
