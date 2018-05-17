package server

import (
	"cretin.co/forge/1.1/app"
)

func Start() {
	s := CreateServer()

	s.POST("/auth", NewEchoContext(Auth, "Authenticate User"))
	s.POST("/signup", NewEchoContext(CreateAccount, "Create User"))

	s.Static("/", "server/www")

	pr := s.Group("/project")
	pr.GET("/", NewEchoContext(GetProjects, "Retrieve Projects"))
	pr.POST("/", NewEchoContext(CreateProject, "Create Project"))
	pr.PUT("/:handle", NewEchoContext(UpdateProject, "Update Project"))
	pr.Use(NewMiddlewareContext(AuthorizeClient, "Authorize Client"))

	//s.Logger.Fatal(s.StartAutoTLS(":" + app.Environment("SECURE_PORT")))
	s.Logger.Fatal(s.Start(":" + app.Environment("PORT")))
}
