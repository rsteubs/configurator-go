package main

import (
	"github.com/labstack/echo"
	"github.com/labstack/echo/middleware"
	"golang.org/x/crypto/acme/autocert"

	"configurator/config"
	"configurator/http"
)

func main() {
	server := createServer()

	//server.Logger.Fatal(server.StartAutoTLS(":" + config.Get("SECURE_PORT")))
	server.Logger.Fatal(server.Start(":" + config.Get("PORT")))
}

func createServer() *echo.Echo {
	e := echo.New()

	e.AutoTLSManager.Cache = autocert.DirCache("http/www/.cache")
	e.Use(middleware.Recover())
	e.Use(middleware.Logger())

	e.POST("/auth", controllers.Auth)
	e.POST("/signup", controllers.CreateAccount)

	e.Static("/", "http/www")

	pr := e.Group("/project")
	pr.GET("/", controllers.GetProjects)
	pr.POST("/", controllers.CreateProject)
	pr.PUT("/:handle", controllers.UpdateProject)
	pr.Use(controllers.AuthorizeClient)

	return e
}
