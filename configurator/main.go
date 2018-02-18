package main

import (
	"net/http"
	"strings"

	"github.com/codegangsta/negroni"
	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"cretin.co/forge/1.0/context"

	"configurator/config"
	"configurator/http"
)

const (
	prefixCurrent = "/bff/current"
	prefix10      = "/bff/1.0"
)

func main() {
	server := createServer()

	context.Log(context.Trace, "Listening on %s...", server.Addr)
	server.ListenAndServe()
}

func createServer() *http.Server {
	r := mux.NewRouter().StrictSlash(false)

	r.HandleFunc("/auth", controllers.Auth).Methods("POST")
	r.HandleFunc("/signup", controllers.CreateAccount).Methods("POST")

	pr := mux.NewRouter().PathPrefix("/project").Subrouter()
	pr.HandleFunc("", controllers.CreateProject).Methods("POST")
	pr.HandleFunc("/{handle}", controllers.UpdateProject).Methods("PUT")

	n := negroni.New()
	n.Use(negroni.NewStatic(http.Dir("http/www/")))
	n.UseHandler(r)

	r.
		PathPrefix("/project").
		Methods("PUT", "POST").
		Handler(negroni.New(negroni.HandlerFunc(controllers.AuthorizeClient), negroni.Wrap(pr)))

	c := cors.New(cors.Options{
		AllowedOrigins:   strings.Split(config.Get("CONFIGURATOR_ALLOWED_ORIGINS"), ","),
		AllowedMethods:   strings.Split(config.Get("CONFIGURATOR_ALLOWED_METHODS"), ","),
		AllowCredentials: true,
	})

	return &http.Server{Addr: ":" + config.Get("PORT"), Handler: c.Handler(n)}
}
