package context

import (
	"bytes"
	"fmt"
	"sync"
	"time"
)

type Transaction struct {
	Title string

	d time.Duration
	t time.Time
	s int
	h map[int]*Transaction

	sync.RWMutex
}

func (t *Transaction) Start(i string) *Transaction {
	tx := createTransaction(i)

	t.Lock()
	t.h[t.nextStep()] = tx
	t.Unlock()

	return tx
}

func (t *Transaction) Startf(f string, a ...interface{}) *Transaction {
	return t.Start(fmt.Sprintf(f, a...))
}

func (t *Transaction) Current() *Transaction {
	if t.s > 0 {
		return t.h[t.s].Current()
	}

	return t
}

func (t *Transaction) Duration() time.Duration {
	return sumDuration(t)
}

func (t *Transaction) String(tabs string) string {
	var b bytes.Buffer

	fmt.Fprintf(&b, "%v%v - \"%v\"\n", tabs, t.d, t.Title)

	for i := 1; i <= t.s; i++ {
		fmt.Fprint(&b, t.h[i].String(tabs+"\t"))
	}

	return b.String()
}

func createTransaction(i string) *Transaction {
	return &Transaction{
		Title: i,
		d:     0,
		t:     time.Now(),
		s:     0,
		h:     make(map[int]*Transaction),
	}
}

func (t *Transaction) nextStep() int {
	t.s++
	return t.s
}

func sumDuration(t *Transaction) time.Duration {
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
