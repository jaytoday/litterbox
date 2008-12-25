
import wsgiref.handlers
from google.appengine.ext import webapp
from google.appengine.ext import db

from model import FreebaseType





class MainHandler(webapp.RequestHandler):

  def get(self):
     
    entities = FreebaseType.all().fetch(1000)
    for e in entities: print e.prop
    self.response.out.write('Hello world!')








def main():
  application = webapp.WSGIApplication([('/', MainHandler)],
                                       debug=True)
  wsgiref.handlers.CGIHandler().run(application)


if __name__ == '__main__':
  main()
