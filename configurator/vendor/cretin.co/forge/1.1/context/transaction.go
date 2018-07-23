package context

import (
	"bytes"
	"fmt"
	"sync"
	"time"
)

type Tx struct {
	Title string

	d time.Duration
	t time.Time
	s int
	h map[int]*Tx

	sync.RWMutex
}

func (t *Tx) Start(i string) *Tx {
	tx := createTransaction(i)

	t.Lock()
	t.h[t.nextStep()] = tx
	t.Unlock()

	return tx
}

func (t *Tx) Startf(f string, a ...interface{}) *Tx {
	return t.Start(fmt.Sprintf(f, a...))
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

	fmt.Fprintf(&b, "%v%v - \"%v\"\n", tabs, t.d, t.Title)

	for i := 1; i <= t.s; i++ {
		fmt.Fprint(&b, t.h[i].String(tabs+"\t"))
	}

	return b.String()
}

func createTransaction(i string) *Tx {
	return &Tx{
		Title: i,
		d:     0,
		t:     time.Now(),
		s:     0,
		h:     make(map[int]*Tx),
	}
}

func (t *Tx) nextStep() int {
	t.s++
	return t.s
}

func sumDuration(t *Tx) time.Duration {
	var runtime time.Duration

	if t.s == 0 {
		runtime = time.Now().Sub(t.t)
	} else {
		for _, i := range t.h {
			runtime += sumDuration(i)
		}
	}

	t.d = runtime

	return t.d
}
