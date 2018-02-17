package main

import (
	"net/http"
	"strings"

	"github.com/codegangsta/negroni"
	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"cretin.co/forge/1.0/context"

	"configurator-web/config"
	"configurator-web/http"
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

	r.HandleFunc("/project", controllers.CreateProject).Methods("POST")
	r.HandleFunc("/project/{handle}", controllers.UpdateProject).Methods("PUT")

	r.
		PathPrefix("/project").
		Methods("PUT", "POST").
		Handler(negroni.New(negroni.HandlerFunc(controllers.AuthorizeClient), negroni.Wrap(r)))

	c := cors.New(cors.Options{
		AllowedOrigins:   strings.Split(config.Get("CONFIGURATOR_ALLOWED_ORIGINS"), ","),
		AllowedMethods:   strings.Split(config.Get("CONFIGURATOR_ALLOWED_METHODS"), ","),
		AllowCredentials: true,
	})

	return &http.Server{Addr: ":" + config.Get("PORT"), Handler: c.Handler(r)}
}
