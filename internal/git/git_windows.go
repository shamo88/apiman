//go:build windows

package git

import (
	"os/exec"
	"syscall"
)

// hideWindowCmd creates an exec.Cmd that hides the window on Windows.
// On Windows, sets the HideWindow flag to prevent a console flash.
func hideWindowCmd(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow: true,
	}
	return cmd
}
