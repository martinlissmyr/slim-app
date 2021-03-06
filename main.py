#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template
from google.appengine.api.urlfetch import fetch
import os
from urlparse import urlparse
from urllib2 import unquote

locationKey = '19881119b0d38abfb5a55f5e5fbd0071'
journeyKey = 'cadcbf599273c5929e89c315795192ef'

class MainHandler(webapp.RequestHandler):
    def get(self):
        self.response.out.write(template.render(os.path.join(os.getcwd(), 'templates/app.html'), {}))
        #self.response.out.write('Usage:<br> <a href="/journey/1200/1019">/journey/fromId/toId</a><br><a href="/station/kungsholmen">/station/searchString</a>')

class Location(webapp.RequestHandler):
    def get(self):
        url = 'https://api.trafiklab.se/sl/realtid/GetSite.json?key=' + locationKey
        sstr = unquote(urlparse(self.request.url).path.lstrip('/'))
        queries = sstr.split('/')
        if len(queries) > 1:
            search = '&stationSearch=' + queries[-1]
            response = fetch(url + search)
            self.response.headers["Content-Type"] = "application/javascript; charset=utf-8"
            self.response.out.write('slim(' + response.content + ');')

class Journey(webapp.RequestHandler):
    def get(self):
        url = 'https://api.trafiklab.se/sl/reseplanerare.json?key=' + journeyKey
        sstr = unquote(urlparse(self.request.url).path.lstrip('/'))
        queries = sstr.split('/')
        if len(queries) > 2:
            search = '&S=' + queries[-2] + '&Z=' + queries[-1]
            response = fetch(url + search)
            self.response.headers["Content-Type"] = "application/javascript; charset=utf-8"
            self.response.out.write('slim(' + response.content + ');')

def main():
    application = webapp.WSGIApplication([
            ('/', MainHandler),
            ('/station/.*', Location),
            ('/journey/.*', Journey)
        ],debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
