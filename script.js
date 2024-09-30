<script id="cjs">// noinspection JSUnresolvedVariable

function fingerprintGo(fingerprintData) {
    let fpData = fingerprintData.filter(function (value) {
        return -1 === ['webgl', 'canvas'].indexOf(value.key);
    });

    fpData.push({
        key: '__hash',
        value: Fingerprint2.x64hash128(fingerprintData.map(function (pair) {
            return pair.value
        }).join(), 31)
    });

    fpDataEncoded = btoa(encodeURIComponent(JSON.stringify(fpData)));

    sendTrack();
}

function collectTrackParams() {
    let params = {fp: fpDataEncoded};

    let dbgip = getParameterByName('dbgip'),
        dbgcountry = getParameterByName('dbgcountry');

    if (dbgip) {
        params.dbgip = dbgip;
    }
    if (dbgcountry) {
        params.dbgcountry = dbgcountry;
    }

    return params;
}

function closingConfirm() {
    return 'Are you sure you want to close this page?';
}

function handleError(msg, data) {
    $.post(
        "/frontlog.php",
        {
            message: msg || '(no message)',
            data: data
        }
    );
}

function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function collectParams() {
    let params = {};

    if (!checkRequired()) {
        return null;
    } else if ($(":input[name='mql-email'], :input[name='mql-name'], :input[name='mql-dob'], :input[name|='mql-extra']").length) {
        params.lead = {};

        let $emailInput = $(":input[name='mql-email']");

        if ($emailInput.length) {
            if (!validateEmail($emailInput.val())) {
                alert("Please type correct email in the form below");
                $emailInput.focus();

                return null;
            }

            params.lead.email = $emailInput.val() ?? null;
        }
        params.lead.name = $(":input[name='mql-name']").val() ?? null;
        params.lead.dob = $(":input[name='mql-dob']").val() ?? null;
        $(":input[name|='mql-extra']").each(function () {
            params.lead[$(this).prop('name').replace('mql-extra-', '')] = $(this).val();
        });
    }

    params.fp = fpDataEncoded;

    let dbgip = getParameterByName('dbgip'),
        dbgcountry = getParameterByName('dbgcountry');

    if (dbgip) {
        params.dbgip = dbgip;
    }
    if (dbgcountry) {
        params.dbgcountry = dbgcountry;
    }

    return params;
}

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

function checkRequired() {
    let errors = [],
        result = true;

    $(":input[name='mql-email'], :input[name='mql-name'], :input[name='mql-dob'], :input[name|='mql-extra']")
        .filter("[required]")
        .each(function () {
            let inputErrorElem = $('.input-error').filter('[data-input-name="' + $(this).attr('name') + '"]');

            if ($(this).val().trim().length) {
                if (inputErrorElem.length) {
                    inputErrorElem.text('').toggle(false);
                }

                return;
            }

            if (inputErrorElem.length) {
                inputErrorElem.text('This field is required.').toggle(true);
            } else {
                errors.push(
                    "'" + ($(this).data('label') ? $(this).data('label') : $(this).attr('name')) + "' field is required."
                );
            }

            if (result) {
                $(this).focus();
            }

            result = false;
        });

    if (errors.length) {
        alert(errors.join("\n"));
    }

    return result;
}

function setLeadInfo(name, value) {
    let $input = $(":input[name='mql-" + name + "']");

    value = value.replace(/"/g, '&quot;');

    if ($input.length) {
        $input.val(value);
    } else {
        $('body').append('<input name="mql-' + name + '" type="hidden" value="' + value + '">');
    }
}

function setCF() {
    if (!cf)
        return;

    try {
        document.cookie = 'CF=' + cf + '; path=/';
    } catch (e) {}
}

$(document).ready(function () {
    setCF();

    var currentUrl = new URL(document.location.href),
        queryParams = currentUrl.searchParams;

    if (queryParams.has('offerBack')) {
        queryParams.delete('offerBack');

        if (queryParams.size) {
            window.history.replaceState({}, document.title, currentUrl.pathname + "?" + queryParams.toString());
        } else {
            window.history.replaceState({}, document.title, currentUrl.pathname);
        }
    }

    let iframeMode = window.self !== window.top,
        url = window.location.href.split('#')[0];

    try {
        if (window.requestIdleCallback) {
            requestIdleCallback(function () {
                if (Fingerprint2) {
                    Fingerprint2.get(function (components) {
                        fingerprintGo(components, url, iframeMode);
                    })
                }
            })
        } else {
            setTimeout(function () {
                Fingerprint2.get(function (components) {
                    fingerprintGo(components, url, iframeMode);
                })
            }, 500)
        }
    } catch (e) {}


    $(document).on('click', '.click', function (e) {
        e.preventDefault();

        if ($(this).data('click-disabled'))
            return;

        let params = collectParams();

        if (null === params)
            return;

        $(this).data('click-disabled', true);

        $.get(
            '/click.php',
            params,
            function (data, textStatus) {
                let obj;

                try {
                    obj = $.parseJSON(data);
                } catch (err) {
                    handleError('Error parsing click response (ajax: ' + textStatus + ')', data);
                    return;
                }

                if (undefined === obj.url) {
                    handleError('No url in click response (ajax: ' + textStatus + ')', obj);
                    return;
                }

                try {
                    let params = new URLSearchParams(location.search);
                    let offerBackParam = 'offerBack';
                    let redirectParam = params.has(offerBackParam)
                        ? ""
                        : (Array.from(params).length
                            ? '&'
                            : '?') + `${offerBackParam}=true`;

                    history.pushState(null, document.title, `${location.toString()}${redirectParam}`);

                    window.onbeforeunload = null;
                    window.parent.location.href = obj.url;
                } catch (err) {
                    handleError(err.message);
                }
            }
        ).always(
            function () {
                $(this).data('click-disabled', false);
            }
        );
    });
    
    if (typeof exitPopunder !== 'undefined') {
        if(exitPopunder) window.onbeforeunload = closingConfirm;
    }
});</script>