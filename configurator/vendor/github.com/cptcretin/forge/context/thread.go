package context

type Thread struct {
    tx *Tx
}

type Task func(tx *Tx)

func (c *C) NewThread(title string, a ...interface{}) *Thread {
    tx := c.Start(title, a...)
    tx.txType = background
    
    return &Thread {
        tx,
    }
}

func (t *Tx) NewThread(title string, a ...interface{}) *Thread {
    tx := t.Start(title, a...)
    tx.txType = background
    
    return &Thread {
        tx,
    }
}

func (th *Thread) Run(t Task) {
    th.tx.c.wg.Add(1)
    
    f := func() {
        defer  th.tx.c.wg.Done()
        
        t(th.tx)
    }
    
    go f()
}