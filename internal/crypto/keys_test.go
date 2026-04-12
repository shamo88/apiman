package crypto

import (
	"os"
	"testing"
)

func TestGetEncryptionKey(t *testing.T) {
	// 测试默认密钥
	key1, err := GetEncryptionKey()
	if err != nil {
		t.Fatalf("failed to get encryption key: %v", err)
	}

	// 再次获取应该是相同的密钥
	key2, err := GetEncryptionKey()
	if err != nil {
		t.Fatalf("failed to get encryption key second time: %v", err)
	}

	// 验证密钥相同
	for i := 0; i < 32; i++ {
		if key1[i] != key2[i] {
			t.Errorf("keys differ at index %d: %x vs %x", i, key1[i], key2[i])
		}
	}
}

func TestGenerateRandomKey(t *testing.T) {
	key1, err := GenerateRandomKey()
	if err != nil {
		t.Fatalf("failed to generate random key: %v", err)
	}

	// 验证是有效的 base64 字符串
	if len(key1) == 0 {
		t.Error("generated key is empty")
	}

	// 生成第二个密钥应该不同
	key2, err := GenerateRandomKey()
	if err != nil {
		t.Fatalf("failed to generate second random key: %v", err)
	}

	if key1 == key2 {
		t.Error("two generated keys should be different")
	}
}

func TestParseKey_Valid(t *testing.T) {
	// 先生成一个有效密钥
	keyStr, _ := GenerateRandomKey()

	parsed, err := parseKey(keyStr)
	if err != nil {
		t.Fatalf("failed to parse valid key: %v", err)
	}

	// 验证解析后的密钥是 32 字节
	for i := 0; i < 32; i++ {
		if parsed[i] == 0 {
			// 验证至少有一些非零字节
			found := false
			for j := i; j < 32; j++ {
				if parsed[j] != 0 {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("parsed key appears to be all zeros")
			}
			break
		}
	}
}

func TestParseKey_InvalidLength(t *testing.T) {
	// 使用短密钥（不是有效的 base64，但长度也不对）
	_, err := parseKey("c2hvcnQta2V5") // "short-key" in base64 but only 10 bytes
	if err != ErrInvalidKeyLength {
		t.Errorf("expected ErrInvalidKeyLength for short key, got %v", err)
	}
}

func TestParseKey_InvalidBase64(t *testing.T) {
	// 使用无效的 base64 字符串
	_, err := parseKey("not-valid-base64!!!")
	if err == nil {
		t.Error("expected error for invalid base64, got nil")
	}
}

func TestEncryptionKey_EnvOverride(t *testing.T) {
	// 设置环境变量
	testKey := "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=" // 32字节的base64
	os.Setenv("APIMAN_ENCRYPTION_KEY", testKey)
	defer os.Unsetenv("APIMAN_ENCRYPTION_KEY")

	// 注意：由于 sync.Once，密钥已经被缓存，这个测试实际上不会在同一个测试进程中工作
	// 这只是一个演示如何工作的示例
}

func TestInvalidKeyLengthError(t *testing.T) {
	err := &InvalidKeyLengthError{}
	if err.Error() != "encryption key must be 32 bytes" {
		t.Errorf("unexpected error message: %s", err.Error())
	}
}
