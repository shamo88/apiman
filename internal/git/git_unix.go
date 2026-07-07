//go:build !windows

package git

import (
	"os/exec"
)

// hideWindowCmd creates an exec.Cmd. On non-Windows platforms (macOS, Linux),
// there is no console window to hide, so this is a simple wrapper around exec.Command.
func hideWindowCmd(name string, args ...string) *exec.Cmd {
	return exec.Command(name, args...)
}
