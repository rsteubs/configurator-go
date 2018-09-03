package context

import (
	"bytes"
	"fmt"
	"sync"
	"time"
)

type txType uint8

type Tx struct {
	Title string

	c      *C
	txType txType
	d      time.Duration
	t      time.Time
	s      int
	h      map[int]*Tx

	sync.RWMutex
}

const (
	foreground txType = 10
	background txType = 20
)

func (t *Tx) Start(i string, a ...interface{}) *Tx {
	tx := createTransaction(t.c, fmt.Sprintf(i, a...))

	t.Lock()
	t.h[t.nextStep()] = tx
	t.Unlock()

	return tx
}

func (t *Tx) Current() *Tx {
	if t.s > 0 {
		return t.h[t.s].Current()
	}

	return t
}

func (t *Tx) Duration() time.Duration {
	return sumDuration(t)
}

func (t *Tx) String(tabs string) string {
	var b bytes.Buffer
	var bg string

	if t.txType == background {
		bg = " (bg)"
	}

	fmt.Fprintf(&b, "%v%v%s - \"%v\"\n", tabs, t.d, bg, t.Title)

	for i := 1; i <= t.s; i++ {
		fmt.Fprint(&b, t.h[i].String(tabs+"\t"))
	}

	return b.String()
}

func createTransaction(c *C, i string) *Tx {
	return &Tx{
		Title:  i,
		c:      c,
		txType: foreground,
		d:      0,
		t:      time.Now(),
		s:      0,
		h:      make(map[int]*Tx),
	}
}

func (t *Tx) nextStep() int {
	t.s++
	return t.s
}

func sumDuration(t *Tx) time.Duration {
	t.d = time.Now().Sub(t.t)

	if t.s > 0 {
		for _, i := range t.h {
			sumDuration(i)
		}
	}

	return t.d
}
