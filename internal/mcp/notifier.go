package mcp

import (
	"encoding/json"
	"log"
	"sync"
)

// Event is a single Server-Sent Event payload.
type Event struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

// Notifier broadcasts Events to all subscribed SSE clients.
// Subscribers receive events on a buffered channel; full channels drop the
// event and log so a slow client cannot stall publishers or other subscribers.
type Notifier struct {
	mu      sync.Mutex
	clients map[chan Event]struct{}
}

// NewNotifier returns a ready-to-use Notifier.
func NewNotifier() *Notifier {
	return &Notifier{clients: make(map[chan Event]struct{})}
}

// Subscribe returns a buffered channel of Events and an unsubscribe func.
// cap is the buffer size; callers should drain promptly.
func (n *Notifier) Subscribe(bufferSize int) (<-chan Event, func()) {
	if bufferSize <= 0 {
		bufferSize = 32
	}
	ch := make(chan Event, bufferSize)
	n.mu.Lock()
	n.clients[ch] = struct{}{}
	n.mu.Unlock()

	unsub := func() {
		n.mu.Lock()
		if _, ok := n.clients[ch]; ok {
			delete(n.clients, ch)
			close(ch)
		}
		n.mu.Unlock()
	}
	return ch, unsub
}

// Broadcast sends evt to every subscriber. Non-blocking: if a subscriber's
// buffer is full the event is dropped for that client and logged once.
func (n *Notifier) Broadcast(evt Event) {
	n.mu.Lock()
	defer n.mu.Unlock()
	if len(n.clients) == 0 {
		return
	}
	for ch := range n.clients {
		select {
		case ch <- evt:
		default:
			log.Printf("[MCP] notifier: dropping event (subscriber buffer full)")
		}
	}
}

// ClientCount returns the number of active subscribers (for diagnostics).
func (n *Notifier) ClientCount() int {
	n.mu.Lock()
	defer n.mu.Unlock()
	return len(n.clients)
}

// EncodeSSE serializes a single Event into the SSE wire format with a
// trailing blank line. The data field is JSON-marshalled; if marshalling
// fails, the data is replaced with a quoted error string.
func EncodeSSE(evt Event) []byte {
	data, err := json.Marshal(evt.Data)
	if err != nil {
		data = []byte(`{"error":"event data marshal failed"}`)
	}
	// Use a scratch builder to keep this allocation-light.
	buf := make([]byte, 0, len(evt.Type)+len(data)+32)
	buf = append(buf, "event: "...)
	buf = append(buf, evt.Type...)
	buf = append(buf, '\n')
	buf = append(buf, "data: "...)
	buf = append(buf, data...)
	buf = append(buf, '\n', '\n')
	return buf
}
