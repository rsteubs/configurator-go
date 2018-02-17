package context

import (
    "bytes"
    "fmt"
    "time"
)

type Transaction struct {
    Title string
    Duration time.Duration

    t time.Time
    s int
    h map[int]*Transaction
}

func (t *Transaction) StartTransaction(i string) *Transaction {
    tx := createTransaction(i)
    t.h[t.nextStep()] = tx

    return tx
}

func (t *Transaction) StartTransactionf(f string, a ...interface{}) *Transaction {
    return t.StartTransaction(fmt.Sprintf(f, a))
}

func (t *Transaction) CurrentTransaction() *Transaction {
    if t.s > 0 {
        return t.h[t.s].CurrentTransaction()
    }

    return t
}

func (t *Transaction) GetDuration() time.Duration {
    return sumDuration(t)
}

func (t *Transaction) String(tabs string) string {
    var b bytes.Buffer

    fmt.Fprintf(&b, "%v%v - \"%v\"\n", tabs, t.Duration, t.Title)

    for i := 1; i <= t.s; i++ {
        fmt.Fprint(&b, t.h[i].String(tabs + "\t"))
    }

    return b.String()
}

func createTransaction(i string) *Transaction {
    return &Transaction {
        i,
        0,
        time.Now(),
        0,
        make(map[int]*Transaction),
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

    t.Duration = runtime

    return t.Duration
}