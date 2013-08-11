Utils =

  toDateString: (date) ->
    fmt = (x) ->
      if value < 10 then "0#{value}" else value.toString()

    day = date.getDate()
    month = date.getMonth() + 1
    year = date.getFullYear()

    "#{year}-#{fmt month}-#{fmt day}"

  call: (path, callback, data, mtd, error) ->
    method = mtd ? (if data? then 'GET' else 'POST')
    url = "rest/#{path}"

    failure = (e) ->
      msg = error ? "#{method} '#{url}' failed unexpectedly"

      if error and typeof error is 'function'
        error e
      else
        console.error msg

        box = $('#alertdiv')
        if box
          box.find('span').text(msg)
          box.addClass('in')

    onFailure = (_, stat, e) ->
      if error
        failure e
      else if stat
        failure stat
      else
        failure()

    onSuccess = (response) ->
      if response and response.success
        callback response.data if callback
      else if response.message
        failure response.message
      else
        failure()

    postData =
      if data
        if typeof data is 'string'
          data
        else
          JSON.stringify(data)
      else null

    $.ajax(
      type: method
      success: onSuccess
      error: onFailure
      data: postData
    )

# vim: set et sts=2 sw=2:
