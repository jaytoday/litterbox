var pqjs = document.getElementsByTagName("script");
pqjs = pqjs[pqjs.length - 1];

var introItems =
[
        {url: 'http://localhost:8080/intro/?page=intro', item_type:'intro', answers: ['Take This Quiz'], noSkip: true, vendor: "{{ vendor_name }}"},
        {url: 'http://localhost:8080/intro/?page=instructions', item_type:'instructions', answers: [ 'dog ate', 'web made' ], noSkip: true},
        {url: 'http://localhost:8080/intro/?page=instructions2', item_type:'instructions2', answers: [ 'compilers', 'interpreters' ], timed: "instructions2", timeout: 'reset'},
        {url: 'http://localhost:8080/intro/?page=begin_quiz', item_type:'begin_quiz', answers: [ 'Begin Quiz' ], noSkip: true}
]

var pqwidget, quizWrap, itemDiv, pqdiv, frameUrl = "http://localhost:8080/quiz_frame", itemTick = 0, introDone = false;;

function addScript(src)
{
        var s = document.createElement("script");
        s.src = src;
        s.rel = "javascript";
        s.type = "text/javascript";
        pqjs.parentNode.appendChild(s);
}

function addStyle(src)
{
        var s = document.createElement("link");
        s.href = src;
        s.rel = "stylesheet";
        s.type = "text/css";
        pqjs.parentNode.appendChild(s);
}

var sinkTask =
{
        length: 0,
        tasks: {},
        t: Number(),
        add: function(cond, func, args, altFunc)
        {
                var self = this;
                this.tasks[this.length++] = { cond:cond, func: func, args: args, callee: arguments.callee };
                if(this.length > 0)
                        this.t = setInterval(function()
                        {
                                for(var i in self.tasks)
                                {
                                        try
                                        {
                                                if(self.tasks[i].cond())
                                                {
                                                        self.tasks[i].func.apply(self.tasks[i].callee, self.tasks[i].args);
                                                        delete self.tasks[i];
                                                        self.length--;
                                                }
                                        }
                                        catch(e)
                                        {
                                                console.error(e);
                                        }
                                }
                                if(self.length == 0)
                                        clearInterval(self.t);
                        },13);
        }
}

//START//

try
{
        if(jQuery)
                pqLoad();
}
catch(e)
{
        addScript("/pqwidget/jquery.js");
        addStyle("/pqwidget/pqwidget.css");

        setTimeout(waitForJQ, 60);
}

function waitForJQ()
{
        try
        {
                if(jQuery)
                        pqLoad();
        }
        catch(e)
        {
                setTimeout(waitForJQ, 60);
        }
}

function loadNextItem()
{
        $.ajax(
        {
                url: introItems[itemTick].url + "&_t=" + (new Date()).valueOf(),
                dataType: "jsonp",
                cache: false,
                success: function(html, s)
                {
                        var appendItem = function(html)
                        {
                                quizWrap.find("#quiz_content").html(html);

                                $("#quiz_answers .answer").hide();

                                var quizItem = introItems[itemTick];

                                for(var i in quizItem.answers)
                                {
                                        /* some settings... */
                                        $('#quiz_content').attr('class', quizItem.item_type + '_content');
                                        $('#quiz_answers').attr('class', quizItem.item_type + '_answers');
                                        $('#quiz_inner').attr('class', quizItem.item_type + '_quiz_inner');
                                        $('.quiz_selection').attr('id', quizItem.item_type + '_quiz_selection');
                                        
                                        
                                        if (quizItem.item_type == 'intro' || quizItem.item_type == 'begin_quiz' || quizItem.item_type == 'quiz_complete'){  
                                                var this_answer = $('#quiz_answers #confirm');
                                        }
                                        else
                                        { 
                                                var this_answer = $('#quiz_answers .answer:eq(' + i + ')'); 
                                        }

                                        this_answer
                                                .show()
                                                .find('.answertext')
                                                .html(quizItem.answers[i]);
                                }
                        };

                        if(!quizWrap)
                                sinkTask.add(function() { return !!quizWrap }, appendItem, [ html ]);
                        else
                                appendItem(html)
                }
        });
}

function pqLoad()
{

        pqwidget = $("#pqwidget");

        pqdiv = jQuery('<div id="pqdiv">Take the Plopquiz</div>')
                .appendTo(pqwidget)
                .click(function(e)
                {
                        if(!quizWrap)
                                $.ajax({
                                        cache: false,
                                        url: frameUrl + "?_t=" + (new Date()).valueOf(),
                                        dataType: "jsonp",
                                        success: function(html, s)
                                        {
                                                var docHieght = $(document).height();
                                                var docWidth = $(document).width();

                                                $("body").append(html);

                                                quizWrap = $("#quiz_wrap");

                                                $("#quiz_outer")
                                                        .show()
                                                        .css("left", (docWidth / 2) - ($("#quiz_outer").width() / 2));

                                                $("#quiz_overlay").css(
                                                {
                                                        height: docHieght,
                                                        width: docWidth
                                                });

                                                $("#quiz_close").click(function()
                                                {
                                                        quizWrap.hide();
                                                });

                                                $('#quiz_wrap')
                                                        .bind('quizstarting', function()
                                                        {
                                                                $(this).show();
                                                        })
                                                        .bind('quizclosing', function()
                                                        {
                                                                $(this).hide();

                                                                // reset to start of quiz, later this should handle skipping instructions;
                                                        });

                                                $('#quiz_close').click(function()
                                                {
                                                        $.event.trigger('quizclosing');
                                                        
                                                        window.location = "/preview/";
                                                });

                                                $('#quiz_timer')
                                                        .bind('quizItemLoaded', function(event, quizItem)
                                                        {
                                                                var self = this;
                                                                if(!quizItem || !quizItem.timed)
                                                                        return;

                                                                // reset and start timer.
                                                                var reset = function()
                                                                {
                                                                      $('.timer_inner', self).stop();
                                                                        
                                                                        $('.timer_inner', self)
                                                                                .css('width', '100%');
                                                                                
                                                                                if (quizItem.item_type == "quiz_item")
                                                                                {
                                                                                        timer_width = $('.timer_bar').width(); // to calculate score
                                                                                        $('#quiz_answers').find('div').addClass('disabled');
                                                                                        $('.timer_inner', self).animate({opacity: 1.0}, 2000, function()
                                                                                        {
                                                                                                $('#quiz_content').animate({opacity: 1}, 1000);
                                                                                                $('#quiz_answers').find('div').removeClass('disabled');
                                                                                        });
                                                                                }
                                                                                
                                                                                $('.timer_inner', self).animate(
                                                                                {
                                                                                        width: 0
                                                                                },
                                                                                {
                                                                                        complete: function()
                                                                                        {
                                                                                                if(quizItem.timeout == "reset")
                                                                                                {
                                                                                                        if(quizItem.timed)
                                                                                                                //$.plopquiz.specialTimers[quizItem.timed]();

                                                                                                        $(self).stop();
                                                                                                      return reset();
                                                                                                }

                                                                                                //$.plopquiz.submitAnswer(quizItem.timed, quizItem);
                                                                                        },
                                                                                        duration: 1800,
                                                                                        easing: 'linear'
                                                                                })
                                                                                .show();
                                                                }
                                                                reset();
                                                        })
                                                        .bind('loadingQuizItem', function()
                                                        {
                                                                $(this).stop();
                                                        })
                                                        .bind('submitingAnswer', function()
                                                        {
                                                                $(this).stop();
                                                        });

                                               
                                                var textHolder = $('#blank').text();

                                                $('#quiz_answers .answer').hover(function()
                                                {
                                                        if ($(this).attr('id') == 'skip')
                                                                return;

                                                        $('#blank').html($('.answertext', this).text().replace(/\ /g, "&nbsp;")).css({'padding': '0px 0px'});
                                                        
                                                },
                                                function()
                                                {
                                                        $('#blank').text(textHolder).css({'padding': '0px 34px'});
                                                })
                                                .click(function(e)
                                                {
                                                        if ($(this).hasClass('disabled')){ return false; }
                                              
                                                        itemTick++;
                                                        loadNextItem();
                                                       //$.plopquiz.submitAnswer($(this).find('div.answertext').text().replace(/\n/g,"")); 
                                                })
                                                .each(function()
                                                {
                                                        //$(this).attr('href', "#" + $(this).attr('id'));
                                                });

                                                //if($.plopquiz.settings.autoStart)
                                                //        $.plopquiz.start();

                                        }
                                });
                        else
                                quizWrap.show();

                        loadNextItem();
                });
}
